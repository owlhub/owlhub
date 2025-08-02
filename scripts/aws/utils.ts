import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { EC2Client, DescribeRegionsCommand } from '@aws-sdk/client-ec2';

/**
 * Assume an AWS role
 * @param roleArn - The ARN of the role to assume
 * @param externalId - The external ID to use when assuming the role (optional)
 * @param region - The AWS region to use
 * @returns The credentials for the assumed role, or null if the role could not be assumed
 */
export async function assumeRole(roleArn: string, externalId?: string, region: string = 'us-east-1') {
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

/**
 * Get all AWS regions
 * @param credentials - AWS credentials
 * @param region - AWS region to initialize the EC2 client
 * @param disabledRegions - Optional array of disabled regions to exclude
 * @returns Array of region names
 */
export async function getAllRegions(credentials: any, region: string, disabledRegions: string[] = []): Promise<string[]> {
  try {
    const ec2Client = new EC2Client({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
      }
    });

    const command = new DescribeRegionsCommand({});
    const response = await ec2Client.send(command);

    if (!response.Regions || response.Regions.length === 0) {
      console.log('No regions found, using default region');
      // Check if the default region is disabled
      if (disabledRegions.includes(region)) {
        console.log(`Default region ${region} is disabled, returning empty array`);
        return [];
      }
      return [region];
    }

    // Get all regions and filter out disabled ones
    const allRegions = response.Regions
      .filter(r => r.RegionName)
      .map(r => r.RegionName as string);

    if (disabledRegions.length === 0) {
      return allRegions;
    }

    const enabledRegions = allRegions.filter(r => !disabledRegions.includes(r));

    if (disabledRegions.length > 0) {
      console.log(`Filtered out ${disabledRegions.length} disabled regions, using ${enabledRegions.length} enabled regions`);
    }

    return enabledRegions;
  } catch (error) {
    console.error('Error getting AWS regions:', error);
    // Return the provided region as fallback, unless it's disabled
    if (disabledRegions.includes(region)) {
      console.log(`Default region ${region} is disabled, returning empty array`);
      return [];
    }
    return [region];
  }
}
