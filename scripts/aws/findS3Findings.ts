import { 
  S3Client, 
  ListBucketsCommand, 
  GetBucketPolicyStatusCommand,
  GetBucketPolicyStatusCommandOutput,
  GetPublicAccessBlockCommand,
  GetPublicAccessBlockCommandOutput,
  GetBucketAclCommand,
  GetBucketAclCommandOutput
} from '@aws-sdk/client-s3';

// Type for S3 commands
type S3Command = 
  | GetBucketPolicyStatusCommand
  | GetBucketAclCommand
  | GetPublicAccessBlockCommand;

/**
 * Find S3 buckets that are publicly accessible
 * @param credentials - AWS credentials
 * @param region - AWS region
 * @param accountId - AWS account ID
 * @returns Array of security findings
 */
export async function findS3Findings(credentials: any, region: string, accountId: string | null = null) {
  try {
    console.log('Finding S3 buckets that are publicly accessible');

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

    // Check each bucket for public accessibility
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
    }

    console.log(`Found ${publiclyAccessibleFindings.length} publicly accessible S3 buckets`);

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
