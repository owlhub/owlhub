import { 
  OrganizationsClient, 
  ListAccountsCommand,
  Account,
  ListPoliciesCommand,
  DescribePolicyCommand,
  PolicyType
} from '@aws-sdk/client-organizations';
import { PrismaClient } from '@prisma/client';

import {
  assumeRole,
  getAllRegions
} from './utils'

/**
 * Discover AWS accounts in an organization
 * @param roleArn - The ARN of the role to assume in the management account
 * @param externalId - The external ID to use when assuming the role (optional)
 * @param region - The AWS region to use
 * @returns Array of discovered AWS accounts
 */
export async function discoverAWSAccounts(
  roleArn: string, 
  externalId?: string, 
  region: string = 'us-east-1'
): Promise<Account[]> {
  try {
    console.log(`Discovering AWS accounts using role: ${roleArn}`);

    // Assume the role in the management account
    const credentials = await assumeRole(roleArn, externalId, region);

    if (!credentials) {
      console.error('Failed to assume role for AWS account discovery');
      return [];
    }

    // Create Organizations client with the assumed credentials
    const organizationsClient = new OrganizationsClient([{
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
      }
    }]);

    // List all accounts in the organization
    const accounts: Account[] = [];
    let nextToken: string | undefined;

    do {
      const command = new ListAccountsCommand({
        NextToken: nextToken
      });

      const response = await organizationsClient.send(command);

      if (response.Accounts && response.Accounts.length > 0) {
        accounts.push(...response.Accounts);
      }

      nextToken = response.NextToken;
    } while (nextToken);

    console.log(`Discovered ${accounts.length} AWS accounts in the organization`);
    return accounts;
  } catch (error) {
    console.error('Error discovering AWS accounts:', error);
    return [];
  }
}

/**
 * Create or update integrations for discovered AWS accounts
 * @param accounts - The discovered AWS accounts
 * @param managementRoleArn - The ARN of the role in the management account
 * @param externalId - The external ID to use when assuming roles
 * @param appId - The ID of the AWS app
 * @param prisma - The Prisma client instance
 * @param disabledRegions - Optional array of disabled regions to add to the integration config
 * @returns Array of created or updated integration IDs
 */
export async function createOrUpdateIntegrationsForAccounts(
  accounts: Account[],
  managementRoleArn: string,
  externalId: string,
  appId: string,
  prisma: PrismaClient,
  disabledRegions: string[] = []
): Promise<string[]> {
  const processedIntegrationIds: string[] = [];

  // Extract management account ID from the management role ARN
  let managementAccountId = '';
  if (managementRoleArn.startsWith('arn:aws:iam::')) {
    const match = managementRoleArn.match(/arn:aws:iam::(\d+):/);
    if (match && match[1]) {
      managementAccountId = match[1];
    }
  }

  for (const account of accounts) {
    if (!account.Id || !account.Name) {
      console.warn('Account missing ID or Name, skipping');
      continue;
    }

    // Determine if this is the management account
    const isManagementAccount = account.Id === managementAccountId;

    // For management accounts, always use empty disabled regions
    const accountDisabledRegions = isManagementAccount ? [] : disabledRegions;

    if (isManagementAccount) {
      console.log(`Account ${account.Id} (${account.Name}) is the management account. Setting disabled regions to empty.`);
    }

    try {
      // Check if integration for this account already exists
      const existingIntegration = await prisma.integration.findFirst({
        where: {
          appId,
          config: {
            contains: account.Id
          }
        }
      });

      if (existingIntegration) {
        console.log(`Integration for account ${account.Id} (${account.Name}) already exists, updating if needed`);

        // Always update existing integration with disabled regions (even if empty)
        try {
          // Parse the current config
          const existingConfig = JSON.parse(existingIntegration.config);

          // Add or update the disabledRegions field
          existingConfig.disabledRegions = isManagementAccount ? '' : (accountDisabledRegions.length > 0 ? accountDisabledRegions.join(',') : '');

          // Update the integration in the database
          await prisma.integration.update({
            where: { id: existingIntegration.id },
            data: { config: JSON.stringify(existingConfig) }
          });

          console.log(`Updated integration ${existingIntegration.name} with disabled regions: ${isManagementAccount ? 'none (management account)' : (accountDisabledRegions.length > 0 ? accountDisabledRegions.join(',') : 'none')}`);
        } catch (error) {
          console.error(`Error updating integration ${existingIntegration.name} with disabled regions:`, error);
        }

        processedIntegrationIds.push(existingIntegration.id);
        continue;
      }

      // Construct the role ARN for this account using the same role name pattern
      // Extract the role name from the management role ARN
      const roleNameMatch = managementRoleArn.match(/role\/([^/]+)$/);
      if (!roleNameMatch) {
        console.error(`Could not extract role name from management role ARN: ${managementRoleArn}`);
        continue;
      }

      const roleName = roleNameMatch[1];
      const accountRoleArn = `arn:aws:iam::${account.Id}:role/${roleName}`;

      // Create a unique external ID for this account by appending the account ID
      const accountExternalId = `${externalId}-${account.Id}`;

      // Prepare the config object
      const configObj = {
        roleArn: accountRoleArn,
        externalId: accountExternalId,
        region: 'us-east-1', // Default region
        disabledRegions: isManagementAccount ? '' : (accountDisabledRegions.length > 0 ? accountDisabledRegions.join(',') : '')
      };

      // Create integration for this account
      const integration = await prisma.integration.create({
        data: {
          name: `AWS - ${account.Name} (${account.Id})`,
          appId,
          config: JSON.stringify(configObj),
          isEnabled: true
        }
      });

      console.log(`Created integration for account ${account.Id} (${account.Name})`);
      processedIntegrationIds.push(integration.id);
    } catch (error) {
      console.error(`Error creating/updating integration for account ${account.Id} (${account.Name}):`, error);
    }
  }

  return processedIntegrationIds;
}

/**
 * Check if AWS Control Tower is enabled and fetch disabled regions
 * @param credentials - AWS credentials
 * @param region - AWS region
 * @returns Array of disabled regions
 */
export async function checkControlTowerAndGetDisabledRegions(credentials: any, region: string): Promise<string[]> {
  try {
    console.log('Checking if AWS Control Tower is enabled and fetching disabled regions...');

    // Create Organizations client with the assumed credentials
    const organizationsClient = new OrganizationsClient({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
      }
    });

    // Get all available AWS regions
    const allRegions = await getAllRegions(credentials, region);
    console.log(`Found ${allRegions.length} AWS regions`);

    // List all service control policies (SCPs) in the organization
    const listPoliciesCommand = new ListPoliciesCommand({
      Filter: PolicyType.SERVICE_CONTROL_POLICY
    });

    const policiesResponse = await organizationsClient.send(listPoliciesCommand);

    if (!policiesResponse.Policies || policiesResponse.Policies.length === 0) {
      console.log('No service control policies found, Control Tower may not be enabled');
      return [];
    }

    // Look for Control Tower SCPs that deny access to specific regions
    const controlTowerPolicies = policiesResponse.Policies.filter(policy => 
      policy.Name && (
        policy.Name.includes('aws-guardrails') ||
        policy.Name.includes('aws-control-tower') ||
        policy.Name.includes('AWS-Control-Tower') ||
        policy.Name.includes('Deny-') || 
        policy.Name.includes('Region')
      )
    );

    if (controlTowerPolicies.length === 0) {
      console.log('No Control Tower policies found, Control Tower may not be enabled');
      return [];
    }

    console.log(`Found ${controlTowerPolicies.length} potential Control Tower policies`);

    // Get the content of each policy and extract disabled regions
    const disabledRegions = new Set<string>();

    for (const policy of controlTowerPolicies) {
      if (!policy.Id) continue;

      try {
        const describePolicyCommand = new DescribePolicyCommand({
          PolicyId: policy.Id
        });

        const policyResponse = await organizationsClient.send(describePolicyCommand);

        if (!policyResponse.Policy || !policyResponse.Policy.Content) continue;

        const policyContent = JSON.parse(policyResponse.Policy.Content);

        // Look for statements that deny access to specific regions
        if (policyContent.Statement) {
          for (const statement of Array.isArray(policyContent.Statement) ? policyContent.Statement : [policyContent.Statement]) {
            // Only process statements with Sid: GRREGIONDENY
            if (statement.Sid !== "GRREGIONDENY") continue;

            if (statement.Effect === 'Deny' && statement.Condition && statement.Condition.StringNotEquals) {
              const regionCondition = statement.Condition.StringNotEquals['aws:RequestedRegion'];

              if (regionCondition) {
                // The regions listed in the condition are the allowed regions
                // All other regions are disabled
                const allowedRegions = Array.isArray(regionCondition) ? regionCondition : [regionCondition];

                // Add regions that are in allRegions but not in allowedRegions to disabledRegions
                for (const r of allRegions) {
                  if (!allowedRegions.includes(r)) {
                    disabledRegions.add(r);
                  }
                }
              }
            } else if (statement.Effect === 'Deny' && statement.Condition && statement.Condition.StringEquals) {
              const regionCondition = statement.Condition.StringEquals['aws:RequestedRegion'];

              if (regionCondition) {
                // The regions listed in the condition are explicitly denied
                const deniedRegions = Array.isArray(regionCondition) ? regionCondition : [regionCondition];

                // Add denied regions to disabledRegions
                for (const r of deniedRegions) {
                  disabledRegions.add(r);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error getting policy content for policy ${policy.Id}:`, error);
      }
    }

    const disabledRegionsArray = Array.from(disabledRegions);
    console.log(`Found ${disabledRegionsArray.length} disabled regions: ${disabledRegionsArray.join(', ')}`);

    return disabledRegionsArray;
  } catch (error) {
    console.error('Error checking Control Tower and getting disabled regions:', error);
    return [];
  }
}
