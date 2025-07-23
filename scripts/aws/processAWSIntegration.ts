import { PrismaClient } from '@prisma/client';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { findIAMFindings } from './findIAMFindings';
import { findACMFindings } from './findACMFindings';
import { findS3Findings } from './findS3Findings';
import { findVPCFindings } from './findVPCFindings';
import { findEC2Findings } from './findEC2Findings';
import { findRDSFindings } from './findRDSFindings';
import { findCloudFrontFindings } from './findCloudFrontFindings';
import { findEBSFindings } from './findEBSFindings';
import { findELBFindings } from './findELBFindings';
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
 * @param appFindings - App findings for this app type
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

    // Find S3 bucket issues (publicly accessible buckets)
    const s3Findings = await findS3Findings(credentials, region, accountId);
    console.log(`Found ${s3Findings.length} S3 findings in AWS`);

    // Find VPC issues (default VPCs)
    const vpcFindings = await findVPCFindings(credentials, region, accountId);
    console.log(`Found ${vpcFindings.length} VPC findings in AWS`);

    // Find EC2 issues (unattached ENIs)
    const ec2Findings = await findEC2Findings(credentials, region, accountId);
    console.log(`Found ${ec2Findings.length} EC2 findings in AWS`);

    // Find RDS issues (instances and clusters without matching Reserved Instances)
    const rdsFindings = await findRDSFindings(credentials, region, accountId);
    console.log(`Found ${rdsFindings.length} RDS findings in AWS`);

    // Find CloudFront issues (distributions without compression enabled)
    const cloudFrontFindings = await findCloudFrontFindings(credentials, region, accountId);
    console.log(`Found ${cloudFrontFindings.length} CloudFront findings in AWS`);

    // Find EBS issues (volumes using gp2 instead of gp3)
    const ebsFindings = await findEBSFindings(credentials, region, accountId);
    console.log(`Found ${ebsFindings.length} EBS findings in AWS`);

    // Find ELB issues (idle load balancers)
    const elbFindings = await findELBFindings(credentials, region, accountId);
    console.log(`Found ${elbFindings.length} ELB findings in AWS`);

    // Combine all findings
    const foundAppFindings = [
      ...iamFindings,
      ...acmFindings,
      ...s3Findings,
      ...vpcFindings,
      ...ec2Findings,
      ...rdsFindings,
      ...cloudFrontFindings,
      ...ebsFindings,
      ...elbFindings
    ];

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
