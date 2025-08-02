import { 
  S3Client, 
  ListBucketsCommand, 
  GetBucketPolicyStatusCommand,
  GetBucketPolicyStatusCommandOutput,
  GetPublicAccessBlockCommand,
  GetPublicAccessBlockCommandOutput,
  GetBucketAclCommand,
  GetBucketAclCommandOutput,
  GetBucketVersioningCommand,
  GetBucketVersioningCommandOutput,
  GetBucketReplicationCommand,
  GetBucketReplicationCommandOutput,
  GetBucketEncryptionCommand,
  GetBucketEncryptionCommandOutput,
  GetBucketLoggingCommand,
  GetBucketLoggingCommandOutput,
  GetBucketLifecycleConfigurationCommand,
  GetBucketLifecycleConfigurationCommandOutput,
  GetBucketPolicyCommand,
  GetBucketPolicyCommandOutput
} from '@aws-sdk/client-s3';

// Type for S3 commands
type S3Command = 
  | GetBucketPolicyStatusCommand
  | GetBucketAclCommand
  | GetPublicAccessBlockCommand
  | GetBucketVersioningCommand
  | GetBucketReplicationCommand
  | GetBucketEncryptionCommand
  | GetBucketLoggingCommand
  | GetBucketLifecycleConfigurationCommand
  | GetBucketPolicyCommand;

/**
 * Find S3 buckets that are publicly accessible, have versioning disabled, have replication disabled, have server-side encryption disabled, have access logging disabled, have lifecycle policies disabled, or have no bucket policy
 * @param credentials - AWS credentials
 * @param region - AWS region
 * @param accountId - AWS account ID
 * @param activeRegions - Array of active regions to use
 * @returns Array of security findings
 */
export async function findS3Findings(credentials: any, region: string, accountId: string | null = null, activeRegions: string[]) {
  try {
    console.log('Finding S3 buckets that are publicly accessible, have versioning disabled, have replication disabled, have server-side encryption disabled, have access logging disabled, have lifecycle policies disabled, or have no bucket policy');

    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
      }
    });

    // Get all S3 buckets
    const buckets = await getAllS3Buckets(s3Client);
    console.log(`Found ${buckets.length} S3 buckets`);

    const findings: any[] = [];
    const publiclyAccessibleFindings: any[] = [];
    const versioningDisabledFindings: any[] = [];
    const replicationDisabledFindings: any[] = [];
    const encryptionDisabledFindings: any[] = [];
    const loggingDisabledFindings: any[] = [];
    const lifecycleDisabledFindings: any[] = [];
    const policyNotExistentFindings: any[] = [];
    const objectLevelLoggingDisabledFindings: any[] = [];
    const encryptionInTransitDisabledFindings: any[] = [];
    const mfaDeleteDisabledFindings: any[] = [];

    // Check each bucket for public accessibility, versioning status, replication status, encryption status, logging status, lifecycle status, and policy existence
    for (const bucket of buckets) {
      // Skip if bucket name is undefined
      if (!bucket.Name) continue;

      const bucketName = bucket.Name;

      // Check if the bucket is publicly accessible
      const isPubliclyAccessible = await checkBucketPubliclyAccessible(s3Client, bucketName);

      if (isPubliclyAccessible) {
        const publiclyAccessibleFinding = {
          id: 'aws_s3_bucket_publicly_accessible',
          key: `aws-s3-bucket-publicly-accessible-${bucketName}`,
          title: `S3 Bucket (${bucketName}) Publicly Accessible`,
          description: `S3 bucket (${bucketName}) is configured to allow public access, which could lead to unauthorized access to sensitive data.`,
          additionalInfo: {
            bucketName,
            ...(accountId && { accountId })
          }
        };

        publiclyAccessibleFindings.push(publiclyAccessibleFinding);
        findings.push(publiclyAccessibleFinding);
      }

      // Check if the bucket has versioning disabled
      const isVersioningDisabled = await checkBucketVersioningDisabled(s3Client, bucketName);

      if (isVersioningDisabled) {
        const versioningDisabledFinding = {
          id: 'aws_s3_bucket_versioning_disabled',
          key: `aws-s3-bucket-versioning-disabled-${bucketName}`,
          title: `S3 Bucket (${bucketName}) Versioning Disabled`,
          description: `S3 bucket (${bucketName}) does not have versioning enabled, which increases the risk of accidental deletion or overwrite of objects.`,
          additionalInfo: {
            bucketName,
            ...(accountId && { accountId })
          }
        };

        versioningDisabledFindings.push(versioningDisabledFinding);
        findings.push(versioningDisabledFinding);
      }

      // Check if the bucket has replication disabled
      const isReplicationDisabled = await checkBucketReplicationDisabled(s3Client, bucketName);

      if (isReplicationDisabled) {
        const replicationDisabledFinding = {
          id: 'aws_s3_bucket_replication_disabled',
          key: `aws-s3-bucket-replication-disabled-${bucketName}`,
          title: `S3 Bucket (${bucketName}) Replication Disabled`,
          description: `S3 bucket (${bucketName}) does not have replication enabled, which increases the risk of data loss in case of a regional outage or disaster.`,
          additionalInfo: {
            bucketName,
            ...(accountId && { accountId })
          }
        };

        replicationDisabledFindings.push(replicationDisabledFinding);
        findings.push(replicationDisabledFinding);
      }

      // Check if the bucket has server-side encryption disabled
      const isEncryptionDisabled = await checkBucketEncryptionDisabled(s3Client, bucketName);

      if (isEncryptionDisabled) {
        const encryptionDisabledFinding = {
          id: 'aws_s3_bucket_server_side_encryption_disabled',
          key: `aws-s3-bucket-server-side-encryption-disabled-${bucketName}`,
          title: `S3 Bucket (${bucketName}) Server Side Encryption Disabled`,
          description: `S3 bucket (${bucketName}) does not have server-side encryption enabled, which increases the risk of unauthorized access to sensitive data if the bucket is compromised.`,
          additionalInfo: {
            bucketName,
            ...(accountId && { accountId })
          }
        };

        encryptionDisabledFindings.push(encryptionDisabledFinding);
        findings.push(encryptionDisabledFinding);
      }

      // Check if the bucket has access logging disabled
      const isLoggingDisabled = await checkBucketLoggingDisabled(s3Client, bucketName);

      if (isLoggingDisabled) {
        const loggingDisabledFinding = {
          id: 'aws_s3_bucket_access_logging_disabled',
          key: `aws-s3-bucket-access-logging-disabled-${bucketName}`,
          title: `S3 Bucket (${bucketName}) Access Logging Disabled`,
          description: `S3 bucket (${bucketName}) does not have access logging enabled, which makes it difficult to track access to the bucket and investigate security incidents.`,
          additionalInfo: {
            bucketName,
            ...(accountId && { accountId })
          }
        };

        loggingDisabledFindings.push(loggingDisabledFinding);
        findings.push(loggingDisabledFinding);
      }

      // Check if the bucket has lifecycle policies disabled
      const isLifecycleDisabled = await checkBucketLifecycleDisabled(s3Client, bucketName);

      if (isLifecycleDisabled) {
        const lifecycleDisabledFinding = {
          id: 'aws_s3_bucket_lifecycle_disabled',
          key: `aws-s3-bucket-lifecycle-disabled-${bucketName}`,
          title: `S3 Bucket (${bucketName}) Lifecycle Disabled`,
          description: `S3 bucket (${bucketName}) does not have lifecycle policies enabled, which can lead to increased storage costs and reduced performance over time.`,
          additionalInfo: {
            bucketName,
            ...(accountId && { accountId })
          }
        };

        lifecycleDisabledFindings.push(lifecycleDisabledFinding);
        findings.push(lifecycleDisabledFinding);
      }

      // Check if the bucket has no policy
      const isPolicyNotExistent = await checkBucketPolicyNotExistent(s3Client, bucketName);

      if (isPolicyNotExistent) {
        const policyNotExistentFinding = {
          id: 'aws_s3_bucket_policy_not_existent',
          key: `aws-s3-bucket-policy-not-existent-${bucketName}`,
          title: `S3 Bucket (${bucketName}) Policy Not Existent`,
          description: `S3 bucket (${bucketName}) does not have a bucket policy, which may leave the bucket vulnerable to unauthorized access or actions.`,
          additionalInfo: {
            bucketName,
            ...(accountId && { accountId })
          }
        };

        policyNotExistentFindings.push(policyNotExistentFinding);
        findings.push(policyNotExistentFinding);
      }

      // Check if the bucket has object-level logging disabled
      const isObjectLevelLoggingDisabled = await checkBucketObjectLevelLoggingDisabled(s3Client, bucketName);

      if (isObjectLevelLoggingDisabled) {
        const objectLevelLoggingDisabledFinding = {
          id: 'aws_s3_bucket_object_level_logging_disabled',
          key: `aws-s3-bucket-object-level-logging-disabled-${bucketName}`,
          title: `S3 Bucket (${bucketName}) Without Object-Level Logging`,
          description: `S3 bucket (${bucketName}) does not have object-level logging enabled, which makes it difficult to track and audit object-level operations on the bucket.`,
          additionalInfo: {
            bucketName,
            ...(accountId && { accountId })
          }
        };

        objectLevelLoggingDisabledFindings.push(objectLevelLoggingDisabledFinding);
        findings.push(objectLevelLoggingDisabledFinding);
      }

      // Check if the bucket has encryption in transit disabled
      const isEncryptionInTransitDisabled = await checkBucketEncryptionInTransitDisabled(s3Client, bucketName);

      if (isEncryptionInTransitDisabled) {
        const encryptionInTransitDisabledFinding = {
          id: 'aws_s3_bucket_encryption_in_transit_disabled',
          key: `aws-s3-bucket-encryption-in-transit-disabled-${bucketName}`,
          title: `S3 Bucket (${bucketName}) Encryption in Transit Disabled`,
          description: `S3 bucket (${bucketName}) does not enforce encryption in transit (HTTPS), which could allow sensitive data to be intercepted during transmission.`,
          additionalInfo: {
            bucketName,
            ...(accountId && { accountId })
          }
        };

        encryptionInTransitDisabledFindings.push(encryptionInTransitDisabledFinding);
        findings.push(encryptionInTransitDisabledFinding);
      }

      // Check if the bucket has MFA Delete disabled
      const isMFADeleteDisabled = await checkBucketMFADeleteDisabled(s3Client, bucketName);

      if (isMFADeleteDisabled) {
        const mfaDeleteDisabledFinding = {
          id: 'aws_s3_bucket_mfa_delete_disabled',
          key: `aws-s3-bucket-mfa-delete-disabled-${bucketName}`,
          title: `S3 Bucket (${bucketName}) MFA Delete Disabled`,
          description: `S3 bucket (${bucketName}) does not have MFA Delete enabled, which increases the risk of accidental or malicious deletion of objects.`,
          additionalInfo: {
            bucketName,
            ...(accountId && { accountId })
          }
        };

        mfaDeleteDisabledFindings.push(mfaDeleteDisabledFinding);
        findings.push(mfaDeleteDisabledFinding);
      }
    }

    console.log(`Found ${publiclyAccessibleFindings.length} publicly accessible S3 buckets`);
    console.log(`Found ${versioningDisabledFindings.length} S3 buckets with versioning disabled`);
    console.log(`Found ${replicationDisabledFindings.length} S3 buckets with replication disabled`);
    console.log(`Found ${encryptionDisabledFindings.length} S3 buckets with server-side encryption disabled`);
    console.log(`Found ${loggingDisabledFindings.length} S3 buckets with access logging disabled`);
    console.log(`Found ${lifecycleDisabledFindings.length} S3 buckets with lifecycle policies disabled`);
    console.log(`Found ${policyNotExistentFindings.length} S3 buckets with no bucket policy`);
    console.log(`Found ${objectLevelLoggingDisabledFindings.length} S3 buckets without object-level logging`);
    console.log(`Found ${encryptionInTransitDisabledFindings.length} S3 buckets without encryption in transit`);
    console.log(`Found ${mfaDeleteDisabledFindings.length} S3 buckets without MFA Delete enabled`);

    return findings;
  } catch (error) {
    console.error('Error finding S3 findings:', error);
    return [];
  }
}

/**
 * Get all S3 buckets
 * @param s3Client - S3 client
 * @returns Array of S3 buckets
 */
async function getAllS3Buckets(s3Client: S3Client) {
  try {
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    return response.Buckets || [];
  } catch (error) {
    console.error('Error getting S3 buckets:', error);
    return [];
  }
}

/**
 * Execute an S3 command with region redirection handling
 * @param s3Client - S3 client
 * @param bucketName - Name of the bucket
 * @param command - S3 command to execute
 * @param errorMessage - Message to log on error
 * @returns The response from the command or null if an error occurred
 */
async function executeS3CommandWithRegionRedirection<T>(
  s3Client: S3Client, 
  bucketName: string, 
  command: S3Command,
  errorMessage: string
): Promise<T | null> {
  try {
    return await s3Client.send(command) as T;
  } catch (error: any) {
    // Handle PermanentRedirect error
    if (error.Code === 'PermanentRedirect' && error.Endpoint) {
      console.log(`Using specific endpoint for bucket ${bucketName}: ${error.Endpoint}`);

      // Extract region from the endpoint
      const endpointParts = error.Endpoint.split('.');
      let bucketRegion = 'us-east-1'; // Default region

      // Try to extract region from endpoint (format: bucket-name.s3.region.amazonaws.com)
      if (endpointParts.length >= 4 && endpointParts[1] === 's3') {
        bucketRegion = endpointParts[2];
      }

      // Create a new S3 client with the correct region
      const regionSpecificClient = new S3Client({
        region: bucketRegion,
        credentials: s3Client.config.credentials
      });

      // Retry with the region-specific client
      try {
        return await regionSpecificClient.send(command) as T;
      } catch (retryError) {
        console.log(`${errorMessage} after retry with specific endpoint`);
        return null;
      }
    } else {
      console.log(errorMessage);
      return null;
    }
  }
}

/**
 * Check if bucket versioning is disabled
 * @param s3Client - S3 client
 * @param bucketName - Name of the bucket to check
 * @returns True if bucket versioning is disabled, false otherwise
 */
async function checkBucketVersioningDisabled(s3Client: S3Client, bucketName: string) {
  try {
    const versioningCommand = new GetBucketVersioningCommand({ Bucket: bucketName });
    const versioningResponse = await executeS3CommandWithRegionRedirection<GetBucketVersioningCommandOutput>(
      s3Client,
      bucketName,
      versioningCommand,
      `Error checking versioning for bucket ${bucketName}`
    );

    // If there's no response or Status is not 'Enabled', versioning is considered disabled
    // Status can be undefined (never enabled), 'Suspended', or 'Enabled'
    return !versioningResponse || versioningResponse.Status !== 'Enabled';
  } catch (error) {
    console.error(`Error checking if bucket ${bucketName} has versioning disabled:`, error);
    // In case of error, we'll assume versioning might be disabled
    return true;
  }
}

/**
 * Check if bucket MFA Delete is disabled
 * @param s3Client - S3 client
 * @param bucketName - Name of the bucket to check
 * @returns True if bucket MFA Delete is disabled, false otherwise
 */
async function checkBucketMFADeleteDisabled(s3Client: S3Client, bucketName: string) {
  try {
    const versioningCommand = new GetBucketVersioningCommand({ Bucket: bucketName });
    const versioningResponse = await executeS3CommandWithRegionRedirection<GetBucketVersioningCommandOutput>(
      s3Client,
      bucketName,
      versioningCommand,
      `Error checking MFA Delete for bucket ${bucketName}`
    );

    // MFA Delete can only be enabled on versioned buckets
    // If versioning is not enabled, MFA Delete is considered disabled
    if (!versioningResponse || versioningResponse.Status !== 'Enabled') {
      return true;
    }

    // Check if MFADelete is 'Enabled'
    // MFADelete can be undefined (never enabled) or 'Disabled' or 'Enabled'
    return !versioningResponse.MFADelete || versioningResponse.MFADelete !== 'Enabled';
  } catch (error) {
    console.error(`Error checking if bucket ${bucketName} has MFA Delete disabled:`, error);
    // In case of error, we'll assume MFA Delete might be disabled
    return true;
  }
}

/**
 * Check if bucket replication is disabled
 * @param s3Client - S3 client
 * @param bucketName - Name of the bucket to check
 * @returns True if bucket replication is disabled, false otherwise
 */
async function checkBucketReplicationDisabled(s3Client: S3Client, bucketName: string) {
  try {
    const replicationCommand = new GetBucketReplicationCommand({ Bucket: bucketName });
    const replicationResponse = await executeS3CommandWithRegionRedirection<GetBucketReplicationCommandOutput>(
      s3Client,
      bucketName,
      replicationCommand,
      `Error checking replication for bucket ${bucketName}`
    );

    // If there's no response or no ReplicationConfiguration, replication is considered disabled
    // A bucket with replication enabled will have a ReplicationConfiguration with at least one Rule
    return !replicationResponse || !replicationResponse.ReplicationConfiguration || 
           !replicationResponse.ReplicationConfiguration.Rules || 
           replicationResponse.ReplicationConfiguration.Rules.length === 0;
  } catch (error: any) {
    // AWS returns a specific error when replication is not configured
    if (error.name === 'ReplicationConfigurationNotFoundError' || error.Code === 'ReplicationConfigurationNotFoundError') {
      return true; // Replication is disabled
    }

    console.error(`Error checking if bucket ${bucketName} has replication disabled:`, error);
    // In case of other errors, we'll assume replication might be disabled
    return true;
  }
}

/**
 * Check if bucket encryption is disabled
 * @param s3Client - S3 client
 * @param bucketName - Name of the bucket to check
 * @returns True if bucket encryption is disabled, false otherwise
 */
async function checkBucketEncryptionDisabled(s3Client: S3Client, bucketName: string) {
  try {
    const encryptionCommand = new GetBucketEncryptionCommand({ Bucket: bucketName });
    const encryptionResponse = await executeS3CommandWithRegionRedirection<GetBucketEncryptionCommandOutput>(
      s3Client,
      bucketName,
      encryptionCommand,
      `Error checking encryption for bucket ${bucketName}`
    );

    // If there's no response or no ServerSideEncryptionConfiguration, encryption is considered disabled
    // A bucket with encryption enabled will have a ServerSideEncryptionConfiguration with at least one Rule
    return !encryptionResponse || !encryptionResponse.ServerSideEncryptionConfiguration || 
           !encryptionResponse.ServerSideEncryptionConfiguration.Rules || 
           encryptionResponse.ServerSideEncryptionConfiguration.Rules.length === 0;
  } catch (error: any) {
    // AWS returns a specific error when encryption is not configured
    if (error.name === 'ServerSideEncryptionConfigurationNotFoundError' || 
        error.Code === 'ServerSideEncryptionConfigurationNotFoundError') {
      return true; // Encryption is disabled
    }

    console.error(`Error checking if bucket ${bucketName} has encryption disabled:`, error);
    // In case of other errors, we'll assume encryption might be disabled
    return true;
  }
}

/**
 * Check if bucket access logging is disabled
 * @param s3Client - S3 client
 * @param bucketName - Name of the bucket to check
 * @returns True if bucket access logging is disabled, false otherwise
 */
async function checkBucketLoggingDisabled(s3Client: S3Client, bucketName: string) {
  try {
    const loggingCommand = new GetBucketLoggingCommand({ Bucket: bucketName });
    const loggingResponse = await executeS3CommandWithRegionRedirection<GetBucketLoggingCommandOutput>(
      s3Client,
      bucketName,
      loggingCommand,
      `Error checking logging for bucket ${bucketName}`
    );

    // If there's no response or no LoggingEnabled, logging is considered disabled
    // A bucket with logging enabled will have a LoggingEnabled property with TargetBucket and TargetPrefix
    return !loggingResponse || !loggingResponse.LoggingEnabled || 
           !loggingResponse.LoggingEnabled.TargetBucket;
  } catch (error: any) {
    console.error(`Error checking if bucket ${bucketName} has logging disabled:`, error);
    // In case of error, we'll assume logging might be disabled
    return true;
  }
}

/**
 * Check if bucket lifecycle is disabled
 * @param s3Client - S3 client
 * @param bucketName - Name of the bucket to check
 * @returns True if bucket lifecycle is disabled, false otherwise
 */
async function checkBucketLifecycleDisabled(s3Client: S3Client, bucketName: string) {
  try {
    const lifecycleCommand = new GetBucketLifecycleConfigurationCommand({ Bucket: bucketName });
    const lifecycleResponse = await executeS3CommandWithRegionRedirection<GetBucketLifecycleConfigurationCommandOutput>(
      s3Client,
      bucketName,
      lifecycleCommand,
      `Error checking lifecycle for bucket ${bucketName}`
    );

    // If there's no response or no Rules, lifecycle is considered disabled
    // A bucket with lifecycle enabled will have a Rules array with at least one rule
    return !lifecycleResponse || !lifecycleResponse.Rules || 
           lifecycleResponse.Rules.length === 0;
  } catch (error: any) {
    // AWS returns a specific error when lifecycle is not configured
    if (error.name === 'NoSuchLifecycleConfiguration' || error.Code === 'NoSuchLifecycleConfiguration') {
      return true; // Lifecycle is disabled
    }

    console.error(`Error checking if bucket ${bucketName} has lifecycle disabled:`, error);
    // In case of other errors, we'll assume lifecycle might be disabled
    return true;
  }
}

/**
 * Check if bucket policy is not existent
 * @param s3Client - S3 client
 * @param bucketName - Name of the bucket to check
 * @returns True if bucket policy is not existent, false otherwise
 */
async function checkBucketPolicyNotExistent(s3Client: S3Client, bucketName: string) {
  try {
    const policyCommand = new GetBucketPolicyCommand({ Bucket: bucketName });
    const policyResponse = await executeS3CommandWithRegionRedirection<GetBucketPolicyCommandOutput>(
      s3Client,
      bucketName,
      policyCommand,
      `Error checking policy for bucket ${bucketName}`
    );

    // If there's no response or no Policy, policy is considered not existent
    // A bucket with a policy will have a Policy property with a non-empty string
    return !policyResponse || !policyResponse.Policy || policyResponse.Policy.trim() === '';
  } catch (error: any) {
    // AWS returns a specific error when policy is not configured
    if (error.name === 'NoSuchBucketPolicy' || error.Code === 'NoSuchBucketPolicy') {
      return true; // Policy is not existent
    }

    console.error(`Error checking if bucket ${bucketName} has policy not existent:`, error);
    // In case of other errors, we'll assume policy might not exist
    return true;
  }
}

/**
 * Check if bucket object-level logging is disabled
 * @param s3Client - S3 client
 * @param bucketName - Name of the bucket to check
 * @returns True if bucket object-level logging is disabled, false otherwise
 * 
 * Note: A more accurate check would require the CloudTrail API to check if data events
 * are enabled for the S3 bucket. Since we don't have access to the CloudTrail client,
 * this function assumes object-level logging is disabled for all buckets.
 */
async function checkBucketObjectLevelLoggingDisabled(s3Client: S3Client, bucketName: string) {
  try {
    // In a real implementation, we would use the CloudTrail API to check if data events
    // are enabled for this S3 bucket. Since we don't have access to the CloudTrail client,
    // we'll assume object-level logging is disabled for all buckets.

    // Note: Object-level logging for S3 buckets is configured through AWS CloudTrail data events,
    // not directly on the S3 bucket itself. This would require checking CloudTrail trails to see
    // if they are configured to log data events for this specific bucket.

    return true; // Assume object-level logging is disabled
  } catch (error) {
    console.error(`Error checking if bucket ${bucketName} has object-level logging disabled:`, error);
    // In case of error, we'll assume object-level logging might be disabled
    return true;
  }
}

/**
 * Check if bucket encryption in transit is disabled
 * @param s3Client - S3 client
 * @param bucketName - Name of the bucket to check
 * @returns True if bucket encryption in transit is disabled, false otherwise
 * 
 * Note: This function checks if the bucket policy requires HTTPS connections
 * by looking for a condition that denies access when aws:SecureTransport is false.
 */
async function checkBucketEncryptionInTransitDisabled(s3Client: S3Client, bucketName: string) {
  try {
    // Get the bucket policy
    const policyCommand = new GetBucketPolicyCommand({ Bucket: bucketName });
    const policyResponse = await executeS3CommandWithRegionRedirection<GetBucketPolicyCommandOutput>(
      s3Client,
      bucketName,
      policyCommand,
      `Error checking policy for bucket ${bucketName}`
    );

    // If there's no policy, encryption in transit is considered disabled
    if (!policyResponse || !policyResponse.Policy) {
      return true;
    }

    // Parse the policy and check if it requires HTTPS
    try {
      const policy = JSON.parse(policyResponse.Policy);

      // Check if the policy has statements
      if (!policy.Statement || !Array.isArray(policy.Statement) || policy.Statement.length === 0) {
        return true;
      }

      // Look for a statement that denies access when aws:SecureTransport is false
      const hasSecureTransportCondition = policy.Statement.some((statement: any) => {
        // Check if the statement has a condition
        if (!statement.Condition) {
          return false;
        }

        // Check for Bool condition with aws:SecureTransport set to false
        const boolCondition = statement.Condition.Bool || statement.Condition.bool;
        if (boolCondition && 
            (boolCondition['aws:SecureTransport'] === 'false' || 
             boolCondition['aws:SecureTransport'] === false)) {
          // Check if the effect is Deny
          return statement.Effect === 'Deny';
        }

        return false;
      });

      // If no statement requires HTTPS, encryption in transit is considered disabled
      return !hasSecureTransportCondition;
    } catch (parseError) {
      console.error(`Error parsing policy for bucket ${bucketName}:`, parseError);
      // In case of parsing error, we'll assume encryption in transit might be disabled
      return true;
    }
  } catch (error) {
    console.error(`Error checking if bucket ${bucketName} has encryption in transit disabled:`, error);
    // In case of error, we'll assume encryption in transit might be disabled
    return true;
  }
}

/**
 * Check if a bucket is publicly accessible
 * @param s3Client - S3 client
 * @param bucketName - Name of the bucket to check
 * @returns True if the bucket is publicly accessible, false otherwise
 */
async function checkBucketPubliclyAccessible(s3Client: S3Client, bucketName: string) {
  try {
    // Check bucket policy status
    let isPublic = false;

    // Check policy status
    const policyStatusCommand = new GetBucketPolicyStatusCommand({ Bucket: bucketName });
    const policyStatusResponse = await executeS3CommandWithRegionRedirection<GetBucketPolicyStatusCommandOutput>(
      s3Client,
      bucketName,
      policyStatusCommand,
      `No policy status for bucket ${bucketName}`
    );

    if (policyStatusResponse?.PolicyStatus?.IsPublic) {
      isPublic = true;
    }

    // Check bucket ACL if not already determined to be public
    if (!isPublic) {
      const aclCommand = new GetBucketAclCommand({ Bucket: bucketName });
      const aclResponse = await executeS3CommandWithRegionRedirection<GetBucketAclCommandOutput>(
        s3Client,
        bucketName,
        aclCommand,
        `Error checking ACL for bucket ${bucketName}`
      );

      if (aclResponse) {
        // Check if any grant in the ACL makes the bucket public
        const publicGrants = aclResponse.Grants?.filter((grant: any) => 
          grant.Grantee?.URI === 'http://acs.amazonaws.com/groups/global/AllUsers' || 
          grant.Grantee?.URI === 'http://acs.amazonaws.com/groups/global/AuthenticatedUsers'
        );

        if (publicGrants && publicGrants.length > 0) {
          isPublic = true;
        }
      }
    }

    // Check bucket public access block settings if not already determined to be public
    if (!isPublic) {
      const publicAccessBlockCommand = new GetPublicAccessBlockCommand({ Bucket: bucketName });
      const publicAccessBlockResponse = await executeS3CommandWithRegionRedirection<GetPublicAccessBlockCommandOutput>(
        s3Client,
        bucketName,
        publicAccessBlockCommand,
        `No public access block configuration for bucket ${bucketName}`
      );

      if (publicAccessBlockResponse) {
        // If any of the block public access settings are false, the bucket could be public
        const blockPublicAccess = publicAccessBlockResponse.PublicAccessBlockConfiguration;
        if (blockPublicAccess && 
            (!blockPublicAccess.BlockPublicAcls || 
             !blockPublicAccess.BlockPublicPolicy || 
             !blockPublicAccess.IgnorePublicAcls || 
             !blockPublicAccess.RestrictPublicBuckets)) {
          // This doesn't necessarily mean the bucket is public, but it's a risk
          // We'll consider it potentially public if other checks haven't already determined it's public
          isPublic = true;
        }
      } else {
        // If there's no public access block configuration, assume the bucket could be public
        isPublic = true;
      }
    }

    return isPublic;
  } catch (error) {
    console.error(`Error checking if bucket ${bucketName} is publicly accessible:`, error);
    // In case of error, we'll be cautious and assume the bucket might be public
    return true;
  }
}
