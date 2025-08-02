import { 
  SNSClient, 
  ListTopicsCommand,
  GetTopicAttributesCommand
} from '@aws-sdk/client-sns';

/**
 * Find SNS issues in all AWS regions
 * @param credentials - AWS credentials
 * @param region - AWS region (used to initialize EC2 client for listing regions)
 * @param accountId - AWS account ID
 * @param activeRegions - Array of active regions to use
 * @returns Array of security findings
 */
export async function findSNSFindings(credentials: any, region: string, accountId: string | null = null, activeRegions: string[]) {
  try {
    console.log('Finding SNS issues in all AWS regions');

    // Use the provided active regions
    const regions = activeRegions;
    console.log(`Using ${regions.length} AWS regions`);

    const findings: any[] = [];
    const publiclyAccessibleTopicFindings: any[] = [];

    // Check each region for SNS issues
    for (const regionName of regions) {
      console.log(`Checking region: ${regionName}`);

      const snsClient = new SNSClient({
        region: regionName,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken
        }
      });

      // Find publicly accessible topics
      const publiclyAccessibleTopics = await findPubliclyAccessibleTopics(snsClient, accountId);

      if (publiclyAccessibleTopics.length > 0) {
        for (const topic of publiclyAccessibleTopics) {
          const topicName = topic.topicArn?.split(':').pop() || 'unknown';
          const finding = {
            id: 'aws_sns_topic_publicly_accessible',
            key: `aws-sns-topic-publicly-accessible-${accountId}-${regionName}-${topicName}`,
            title: `Amazon SNS Topic Policy Is Publicly Accessible in Region ${regionName}`,
            description: `SNS Topic (${topicName}) in region ${regionName} has a policy that allows unrestricted access to the public or wide principals (e.g., '*'). This can allow unauthorized users to publish or subscribe to the topic, leading to spam, data leakage, or misuse. SNS policies should follow least privilege and restrict access to known AWS accounts or services only.`,
            additionalInfo: {
              topicName: topicName,
              topicArn: topic.topicArn || undefined,
              region: regionName,
              ...(accountId && { accountId })
            }
          };

          publiclyAccessibleTopicFindings.push(finding);
          findings.push(finding);
        }
      }
    }

    console.log(`Found ${publiclyAccessibleTopicFindings.length} publicly accessible SNS topics across all regions`);
    return findings;
  } catch (error) {
    console.error('Error finding SNS issues:', error);
    return [];
  }
}

/**
 * Find SNS topics that are publicly accessible
 * @param snsClient - SNS client
 * @param accountId - AWS account ID
 * @returns Array of publicly accessible topics
 */
async function findPubliclyAccessibleTopics(snsClient: SNSClient, accountId: string | null) {
  try {
    // List all topics in the region
    const listCommand = new ListTopicsCommand({});
    const listResponse = await snsClient.send(listCommand);
    const topicArns = listResponse.Topics?.map(topic => topic.TopicArn) || [];
    const publiclyAccessibleTopics = [];

    // Check each topic for public access
    for (const topicArn of topicArns) {
      try {
        // Get topic attributes including the policy
        const attributesCommand = new GetTopicAttributesCommand({
          TopicArn: topicArn
        });
        const attributesResponse = await snsClient.send(attributesCommand);

        // If we have a policy, check if it allows public access
        if (attributesResponse.Attributes?.Policy) {
          const policy = JSON.parse(attributesResponse.Attributes.Policy);

          // Check if the policy allows public access
          const isPublic = isTopicPolicyPublic(policy);

          if (isPublic) {
            publiclyAccessibleTopics.push({ topicArn });
          }
        }
      } catch (error) {
        console.error(`Error checking topic policy for ${topicArn}:`, error);
      }
    }

    return publiclyAccessibleTopics;
  } catch (error) {
    console.error('Error finding publicly accessible topics:', error);
    return [];
  }
}

/**
 * Check if a topic policy allows public access
 * @param policy - The topic policy
 * @returns boolean indicating if the policy allows public access
 */
function isTopicPolicyPublic(policy: any): boolean {
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

    // Check for overly permissive conditions
    if (statement.Condition) {
      // Check for conditions that might be too permissive
      // For example, allowing access from any IP address
      if (
        statement.Condition.IpAddress && 
        statement.Condition.IpAddress['aws:SourceIp'] === '0.0.0.0/0'
      ) {
        return true;
      }
    }
  }

  return false;
}
