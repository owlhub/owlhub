import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';

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