import { 
  SQSClient, 
  ListQueuesCommand,
  GetQueueAttributesCommand
} from '@aws-sdk/client-sqs';

/**
 * Find SQS issues in all AWS regions
 * @param credentials - AWS credentials
 * @param region - AWS region (used to initialize EC2 client for listing regions)
 * @param accountId - AWS account ID
 * @param activeRegions - Array of active regions to use
 * @returns Array of security findings
 */
export async function findSQSFindings(credentials: any, region: string, accountId: string | null = null, activeRegions: string[]) {
  try {
    console.log('Finding SQS issues in all AWS regions');

    // Use the provided active regions
    const regions = activeRegions;
    console.log(`Using ${regions.length} AWS regions`);

    const findings: any[] = [];
    const publiclyAccessibleQueueFindings: any[] = [];

    // Check each region for SQS issues
    for (const regionName of regions) {
      console.log(`Checking region: ${regionName}`);

      const sqsClient = new SQSClient({
        region: regionName,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken
        }
      });

      // Find publicly accessible queues
      const publiclyAccessibleQueues = await findPubliclyAccessibleQueues(sqsClient, accountId);

      if (publiclyAccessibleQueues.length > 0) {
        for (const queue of publiclyAccessibleQueues) {
          const queueName = queue.queueUrl.split('/').pop() || 'unknown';
          const finding = {
            id: 'aws_sqs_queue_publicly_accessible',
            key: `aws-sqs-queue-publicly-accessible-${accountId}-${regionName}-${queueName}`,
            title: `Amazon SQS Queue Is Publicly Accessible in Region ${regionName}`,
            description: `SQS Queue (${queueName}) in region ${regionName} has a policy that allows unrestricted access to the public or wide principals (e.g., '*'). Publicly accessible queues can be read from or written to by unauthorized users, which may lead to data leakage, spam, or denial-of-service attacks. Queue policies should follow the principle of least privilege and be limited to known IAM principals or services.`,
            additionalInfo: {
              queueName: queueName,
              queueUrl: queue.queueUrl,
              region: regionName,
              ...(accountId && { accountId })
            }
          };

          publiclyAccessibleQueueFindings.push(finding);
          findings.push(finding);
        }
      }
    }

    console.log(`Found ${publiclyAccessibleQueueFindings.length} publicly accessible SQS queues across all regions`);
    return findings;
  } catch (error) {
    console.error('Error finding SQS issues:', error);
    return [];
  }
}

/**
 * Find SQS queues that are publicly accessible
 * @param sqsClient - SQS client
 * @param accountId - AWS account ID
 * @returns Array of publicly accessible queues
 */
async function findPubliclyAccessibleQueues(sqsClient: SQSClient, accountId: string | null) {
  try {
    // List all queues in the region
    const listCommand = new ListQueuesCommand({});
    const listResponse = await sqsClient.send(listCommand);
    const queueUrls = listResponse.QueueUrls || [];
    const publiclyAccessibleQueues = [];

    // Check each queue for public access
    for (const queueUrl of queueUrls) {
      try {
        // Get queue attributes including the policy
        const attributesCommand = new GetQueueAttributesCommand({
          QueueUrl: queueUrl,
          AttributeNames: ['Policy']
        });
        const attributesResponse = await sqsClient.send(attributesCommand);
        
        // If we have a policy, check if it allows public access
        if (attributesResponse.Attributes?.Policy) {
          const policy = JSON.parse(attributesResponse.Attributes.Policy);
          
          // Check if the policy allows public access
          const isPublic = isQueuePolicyPublic(policy);
          
          if (isPublic) {
            publiclyAccessibleQueues.push({ queueUrl });
          }
        }
      } catch (error) {
        console.error(`Error checking queue policy for ${queueUrl}:`, error);
      }
    }

    return publiclyAccessibleQueues;
  } catch (error) {
    console.error('Error finding publicly accessible queues:', error);
    return [];
  }
}

/**
 * Check if a queue policy allows public access
 * @param policy - The queue policy
 * @returns boolean indicating if the policy allows public access
 */
function isQueuePolicyPublic(policy: any): boolean {
  // Check if the policy has statements
  if (!policy.Statement || !Array.isArray(policy.Statement)) {
    return false;
  }

  // Check each statement for public access
  for (const statement of policy.Statement) {
    // Skip if the statement effect is not "Allow"
    if (statement.Effect !== 'Allow') {
      continue;
    }

    // Check if the principal allows public access
    if (
      statement.Principal === '*' || 
      (typeof statement.Principal === 'object' && statement.Principal.AWS === '*') ||
      (Array.isArray(statement.Principal) && statement.Principal.includes('*'))
    ) {
      return true;
    }

    // Check if the principal is a public AWS account or organization
    if (typeof statement.Principal === 'object' && statement.Principal.AWS) {
      const principals = Array.isArray(statement.Principal.AWS) 
        ? statement.Principal.AWS 
        : [statement.Principal.AWS];

      for (const principal of principals) {
        // Check if the principal is a public AWS account or organization
        if (principal === '*' || principal.includes('arn:aws:iam::*')) {
          return true;
        }
      }
    }
  }

  return false;
}