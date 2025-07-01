import { 
  OrganizationsClient, 
  ListAccountsCommand,
  Account
} from '@aws-sdk/client-organizations';
import { PrismaClient } from '@prisma/client';

import {
  assumeRole
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
 * Create integrations for discovered AWS accounts
 * @param accounts - The discovered AWS accounts
 * @param managementRoleArn - The ARN of the role in the management account
 * @param externalId - The external ID to use when assuming roles
 * @param appId - The ID of the AWS app
 * @param prisma - The Prisma client instance
 * @returns Array of created integration IDs
 */
export async function createIntegrationsForAccounts(
  accounts: Account[],
  managementRoleArn: string,
  externalId: string,
  appId: string,
  prisma: PrismaClient
): Promise<string[]> {
  const createdIntegrationIds: string[] = [];

  for (const account of accounts) {
    if (!account.Id || !account.Name) {
      console.warn('Account missing ID or Name, skipping');
      continue;
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
        console.log(`Integration for account ${account.Id} (${account.Name}) already exists, skipping`);
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

      // Create integration for this account
      const integration = await prisma.integration.create({
        data: {
          name: `AWS - ${account.Name} (${account.Id})`,
          appId,
          config: JSON.stringify({
            roleArn: accountRoleArn,
            externalId: accountExternalId,
            region: 'us-east-1' // Default region
          }),
          isEnabled: true
        }
      });

      console.log(`Created integration for account ${account.Id} (${account.Name})`);
      createdIntegrationIds.push(integration.id);
    } catch (error) {
      console.error(`Error creating integration for account ${account.Id} (${account.Name}):`, error);
    }
  }

  return createdIntegrationIds;
}
