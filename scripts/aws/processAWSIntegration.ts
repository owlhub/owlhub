import { PrismaClient } from '@prisma/client';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { findIAMUsersWithOldAccessKeys } from './findIAMUsersWithOldAccessKeys';
import {
  addIntegrationSecurityFindingDetails
} from "../utils/common";

/**
 * Process an AWS integration
 * @param integration - The AWS integration to process
 * @param appTypeId - The ID of the AWS app type
 * @param prisma - The Prisma client instance
 * @param securityFindings - Security findings for this app type
 */
export async function processAWSIntegration(integration: any, appTypeId: string, prisma: PrismaClient, securityFindings: any[] = []) {
  try {
    console.log(`Processing AWS integration: ${integration.name}`);

    const config = JSON.parse(integration.config);
    const roleArn = config.roleArn;
    const externalId = config.externalId;
    const region = config.region || 'us-east-1';

    if (!roleArn) {
      console.error(`Integration ${integration.name} is missing required configuration: roleArn`);
      return;
    }

    // If securityFindings is not provided, return
    if (securityFindings.length === 0) {
      console.log(`No security findings provided for app type: ${appTypeId}`);
      return;
    }

    console.log(`Found ${securityFindings.length} security findings for this app type`);

    // Assume the AWS role
    const credentials = await assumeRole(roleArn, externalId, region);
    
    if (!credentials) {
      console.error(`Failed to assume role for integration: ${integration.name}`);
      return;
    }

    console.log(`Successfully assumed role for integration: ${integration.name}`);

    // Find IAM users with access keys not rotated for more than 90 days
    const foundSecurityFindings = await findIAMUsersWithOldAccessKeys(credentials, region);

    console.log(`Found ${foundSecurityFindings.length} security findings in AWS`, foundSecurityFindings);

    // Create a new array with updated IDs to ensure changes persist
    const updatedSecurityFindings = foundSecurityFindings.map(foundSecurityFinding => {
      // Create a copy of the finding to avoid reference issues
      const updatedFinding = { ...foundSecurityFinding };

      // Update the ID based on key match
      for (const securityFinding of securityFindings) {
        if (updatedFinding.id === securityFinding.key) {
          console.log(`Updating ID for security finding with key ${updatedFinding.key} from ${updatedFinding.id} to ${securityFinding.id}`);
          updatedFinding.id = securityFinding.id;
          updatedFinding.severity = securityFinding.severity;
          break; // Exit the loop once a match is found
        }
      }

      return updatedFinding;
    });

    await addIntegrationSecurityFindingDetails(integration, updatedSecurityFindings, prisma);

    console.log(`Completed processing AWS integration: ${integration.name}`);
  } catch (error) {
    console.error(`Error processing AWS integration ${integration.name}:`, error);
  }
}

/**
 * Assume an AWS role
 * @param roleArn - The ARN of the role to assume
 * @param externalId - The external ID to use when assuming the role (optional)
 * @param region - The AWS region to use
 * @returns The credentials for the assumed role, or null if the role could not be assumed
 */
async function assumeRole(roleArn: string, externalId?: string, region: string = 'us-east-1') {
  try {
    console.log(`Assuming role: ${roleArn} with external ID: ${externalId || 'none'}`);

    const stsClient = new STSClient({ region });
    
    const assumeRoleParams: any = {
      RoleArn: roleArn,
      RoleSessionName: 'OwlHubSecurityScan',
      DurationSeconds: 3600, // 1 hour
    };

    // Add external ID if provided
    if (externalId) {
      assumeRoleParams.ExternalId = externalId;
    }

    const command = new AssumeRoleCommand(assumeRoleParams);
    const response = await stsClient.send(command);

    if (!response.Credentials) {
      console.error('No credentials returned from AssumeRole operation');
      return null;
    }

    return {
      accessKeyId: response.Credentials.AccessKeyId,
      secretAccessKey: response.Credentials.SecretAccessKey,
      sessionToken: response.Credentials.SessionToken,
      expiration: response.Credentials.Expiration
    };
  } catch (error) {
    console.error('Error assuming role:', error);
    return null;
  }
}