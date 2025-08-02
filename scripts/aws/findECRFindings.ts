import { 
  ECRClient, 
  DescribeRepositoriesCommand,
  GetLifecyclePolicyCommand,
  LifecyclePolicyNotFoundException
} from '@aws-sdk/client-ecr';
import { getAllRegions } from './utils';

/**
 * Find ECR issues in all AWS regions
 * @param credentials - AWS credentials
 * @param region - AWS region (used to initialize EC2 client for listing regions)
 * @param accountId - AWS account ID
 * @returns Array of security findings
 */
export async function findECRFindings(credentials: any, region: string, accountId: string | null = null) {
  try {
    console.log('Finding ECR issues in all AWS regions');

    // Get all AWS regions
    const regions = await getAllRegions(credentials, region);
    console.log(`Found ${regions.length} AWS regions`);

    const findings: any[] = [];
    const nonImmutableRepositoryFindings: any[] = [];
    const noLifecyclePolicyFindings: any[] = [];

    // Check each region for ECR issues
    for (const regionName of regions) {
      console.log(`Checking region: ${regionName}`);

      const ecrClient = new ECRClient({
        region: regionName,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken
        }
      });

      // Find repositories without image tag immutability enabled
      const nonImmutableRepositories = await findRepositoriesWithoutTagImmutability(ecrClient);

      if (nonImmutableRepositories.length > 0) {
        for (const repo of nonImmutableRepositories) {
          const finding = {
            id: 'aws_ecr_repository_tag_immutability_disabled',
            key: `aws-ecr-repository-tag-immutability-disabled-${accountId}-${regionName}-${repo.repositoryName}`,
            title: `ECR Repository Does Not Have Image Tag Immutability Enabled in Region ${regionName}`,
            description: `ECR Repository (${repo.repositoryName}) in region ${regionName} does not have image tag immutability enabled. When immutability is off, tags like 'latest' or versioned tags can be overwritten, making it difficult to trace what code is running. Enabling tag immutability prevents tampering and ensures auditability of container deployments.`,
            additionalInfo: {
              repositoryName: repo.repositoryName,
              repositoryArn: repo.repositoryArn,
              region: regionName,
              createdAt: repo.createdAt?.toISOString(),
              ...(accountId && { accountId })
            }
          };

          nonImmutableRepositoryFindings.push(finding);
          findings.push(finding);
        }
      }

      // Find repositories without lifecycle policies configured
      const repositories = await findRepositoriesWithoutLifecyclePolicy(ecrClient);

      if (repositories.length > 0) {
        for (const repo of repositories) {
          const finding = {
            id: 'aws_ecr_repository_no_lifecycle_policy',
            key: `aws-ecr-repository-no-lifecycle-policy-${accountId}-${regionName}-${repo.repositoryName}`,
            title: `ECR Repository Does Not Have a Lifecycle Policy Configured in Region ${regionName}`,
            description: `ECR Repository (${repo.repositoryName}) in region ${regionName} does not have a lifecycle policy configured. Without lifecycle rules, outdated and unused images may accumulate, leading to unnecessary storage costs and difficulty managing image versions. It is recommended to configure policies to expire untagged or old images regularly.`,
            additionalInfo: {
              repositoryName: repo.repositoryName,
              repositoryArn: repo.repositoryArn,
              region: regionName,
              createdAt: repo.createdAt?.toISOString(),
              ...(accountId && { accountId })
            }
          };

          noLifecyclePolicyFindings.push(finding);
          findings.push(finding);
        }
      }
    }

    console.log(`Found ${nonImmutableRepositoryFindings.length} ECR repositories without tag immutability enabled across all regions`);
    console.log(`Found ${noLifecyclePolicyFindings.length} ECR repositories without lifecycle policies configured across all regions`);
    return findings;
  } catch (error) {
    console.error('Error finding ECR issues:', error);
    return [];
  }
}


/**
 * Find ECR repositories without image tag immutability enabled
 * @param ecrClient - ECR client
 * @returns Array of repositories without tag immutability enabled
 */
async function findRepositoriesWithoutTagImmutability(ecrClient: ECRClient) {
  try {
    const command = new DescribeRepositoriesCommand({});
    const response = await ecrClient.send(command);

    // Filter repositories where imageTagMutability is not 'IMMUTABLE'
    const nonImmutableRepositories = (response.repositories || []).filter(repo => 
      repo.imageTagMutability !== 'IMMUTABLE'
    );

    return nonImmutableRepositories;
  } catch (error) {
    console.error('Error finding repositories without tag immutability:', error);
    return [];
  }
}

/**
 * Find ECR repositories without lifecycle policies configured
 * @param ecrClient - ECR client
 * @returns Array of repositories without lifecycle policies
 */
async function findRepositoriesWithoutLifecyclePolicy(ecrClient: ECRClient) {
  try {
    const command = new DescribeRepositoriesCommand({});
    const response = await ecrClient.send(command);
    const repositories = response.repositories || [];
    const repositoriesWithoutLifecyclePolicy = [];

    // Check each repository for a lifecycle policy
    for (const repo of repositories) {
      if (!repo.repositoryName) continue;

      try {
        // Try to get the lifecycle policy for the repository
        const policyCommand = new GetLifecyclePolicyCommand({
          repositoryName: repo.repositoryName
        });
        await ecrClient.send(policyCommand);
        // If we get here, the repository has a lifecycle policy
      } catch (error) {
        // If we get a LifecyclePolicyNotFoundException, the repository doesn't have a lifecycle policy
        if (error instanceof LifecyclePolicyNotFoundException) {
          repositoriesWithoutLifecyclePolicy.push(repo);
        } else {
          console.error(`Error checking lifecycle policy for repository ${repo.repositoryName}:`, error);
        }
      }
    }

    return repositoriesWithoutLifecyclePolicy;
  } catch (error) {
    console.error('Error finding repositories without lifecycle policies:', error);
    return [];
  }
}
