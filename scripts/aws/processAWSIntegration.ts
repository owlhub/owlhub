import { PrismaClient } from '@prisma/client';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { findIAMFindings } from './findIAMFindings';
import { findACMFindings } from './findACMFindings';
import {
  assumeRole
} from './utils'
import { discoverAWSAccounts, createIntegrationsForAccounts } from './discoverAWSAccounts';
import {
  addIntegrationFindingDetails
} from "../utils/common";


/**
 * Process an AWS integration
 * @param integration - The AWS integration to process
 * @param appId - The ID of the AWS app
 * @param prisma - The Prisma client instance
 * @param securityFindings - App findings for this app type
 */
export async function processAWSIntegration(integration: any, appId: string, prisma: PrismaClient, appFindings: any[] = []) {
  try {
    console.log(`Processing AWS integration: ${integration.name}`);

    const config = JSON.parse(integration.config);
    const roleArn = config.roleArn;
    const externalId = config.externalId;
    const region = config.region || 'us-east-1';
    const orgMode = config.orgMode === "true";

    console.log(`orgMode: ${orgMode}`);


    if (!roleArn) {
      console.error(`Integration ${integration.name} is missing required configuration: roleArn`);
      return;
    }

    // If appFindings is not provided, return
    if (appFindings.length === 0) {
      console.log(`No app findings provided for app type: ${appId}`);
      return;
    }

    console.log(`Found ${appFindings.length} app findings for this app type`);

    // Assume the AWS role
    const credentials = await assumeRole(roleArn, externalId, region);

    if (!credentials) {
      console.error(`Failed to assume role for integration: ${integration.name}`);
      return;
    }

    console.log(`Successfully assumed role for integration: ${integration.name}`);

    // Get the AWS account ID
    const stsClient = new STSClient({
      region: region,
      credentials: {
        accessKeyId: credentials.accessKeyId || '',
        secretAccessKey: credentials.secretAccessKey || '',
        sessionToken: credentials.sessionToken || ''
      }
    });

    let accountId = null;
    try {
      const identityCommand = new GetCallerIdentityCommand({});
      const identityResponse = await stsClient.send(identityCommand);
      accountId = identityResponse.Account;
      console.log(`Got AWS account ID: ${accountId}`);

      // If org mode is enabled, discover AWS accounts and create integrations for them
      if (orgMode) {
        console.log(`Organization mode is enabled for integration: ${integration.name}. Discovering AWS accounts...`);

        // Discover AWS accounts in the organization
        const accounts = await discoverAWSAccounts(roleArn, externalId, region);

        if (accounts.length > 0) {
          console.log(`Discovered ${accounts.length} AWS accounts in the organization`);

          // Create integrations for discovered accounts
          const createdIntegrationIds = await createIntegrationsForAccounts(
            accounts,
            roleArn,
            externalId,
            appId,
            prisma
          );

          console.log(`Created ${createdIntegrationIds.length} new integrations for discovered AWS accounts`);
        } else {
          console.log('No AWS accounts discovered in the organization');
        }
      }
    } catch (error) {
      console.error('Error getting AWS account ID or discovering accounts:', error);
    }

    // Find IAM users with access keys not rotated for more than 90 days, inactive access keys, passwords older than 90 days, console users without MFA enabled, and root user access key usage within the last 90 days
    const iamFindings = await findIAMFindings(credentials, region, accountId);
    console.log(`Found ${iamFindings.length} IAM findings in AWS`);

    // Find ACM certificate issues (expired or expiring within 30 days) in all regions
    const acmFindings = await findACMFindings(credentials, region, accountId);
    console.log(`Found ${acmFindings.length} ACM findings in AWS`);

    // Combine all findings
    const foundAppFindings = [...iamFindings, ...acmFindings];

    console.log(`Found ${foundAppFindings.length} total app findings in AWS`);

    // Create a new array with updated IDs to ensure changes persist
    const updatedAppFindings = foundAppFindings.map(foundAppFinding => {
      // Create a copy of the finding to avoid reference issues
      const updatedFinding = { ...foundAppFinding };

      // Update the ID based on key match
      for (const appFinding of appFindings) {
        if (updatedFinding.id === appFinding.key) {
          console.log(`Updating ID for app finding with key ${updatedFinding.key} from ${updatedFinding.id} to ${appFinding.id}`);
          updatedFinding.id = appFinding.id;
          updatedFinding.severity = appFinding.severity;
          break; // Exit the loop once a match is found
        }
      }

      return updatedFinding;
    });

    await addIntegrationFindingDetails(integration, updatedAppFindings, prisma);

    console.log(`Completed processing AWS integration: ${integration.name}`);
  } catch (error) {
    console.error(`Error processing AWS integration ${integration.name}:`, error);
  }
}
