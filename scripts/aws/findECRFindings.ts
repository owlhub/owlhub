import { 
  ECRClient, 
  DescribeRepositoriesCommand,
  GetLifecyclePolicyCommand,
  GetRepositoryPolicyCommand,
  LifecyclePolicyNotFoundException,
  RepositoryPolicyNotFoundException,
  Repository
} from '@aws-sdk/client-ecr';

/**
 * Find ECR issues in all AWS regions
 * @param credentials - AWS credentials
 * @param region - AWS region (used to initialize EC2 client for listing regions)
 * @param accountId - AWS account ID
 * @param activeRegions - Array of active regions to use
 * @returns Array of security findings
 */
export async function findECRFindings(credentials: any, region: string, accountId: string | null = null, activeRegions: string[]) {
  try {
    console.log('Finding ECR issues in all AWS regions');

    // Use the provided active regions
    const regions = activeRegions;
    console.log(`Using ${regions.length} AWS regions`);

    const findings: any[] = [];
    const nonImmutableRepositoryFindings: any[] = [];
    const noLifecyclePolicyFindings: any[] = [];
    const imageScanningDisabledFindings: any[] = [];
    const publiclyAccessibleRepositoryFindings: any[] = [];

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

      // Get all repositories in the region once
      const allRepositories = await getAllRepositories(ecrClient);
      console.log(`Found ${allRepositories.length} ECR repositories in region ${regionName}`);

      // Find repositories without image tag immutability enabled
      const nonImmutableRepositories = findRepositoriesWithoutTagImmutability(allRepositories);

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
      const repositories = await findRepositoriesWithoutLifecyclePolicy(ecrClient, allRepositories);

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

      // Find repositories without image scanning enabled
      const repositoriesWithoutImageScanning = findRepositoriesWithoutImageScanning(allRepositories);

      if (repositoriesWithoutImageScanning.length > 0) {
        for (const repo of repositoriesWithoutImageScanning) {
          const finding = {
            id: 'aws_ecr_repository_image_scanning_disabled',
            key: `aws-ecr-repository-image-scanning-disabled-${accountId}-${regionName}-${repo.repositoryName}`,
            title: `ECR Repository Does Not Have Image Scanning Enabled in Region ${regionName}`,
            description: `ECR Repository (${repo.repositoryName}) in region ${regionName} does not have image scanning enabled. Without this feature, vulnerabilities in container images may go undetected before deployment. Enabling image scanning on push helps identify security issues early in the CI/CD pipeline and supports compliance with container security best practices.`,
            additionalInfo: {
              repositoryName: repo.repositoryName,
              repositoryArn: repo.repositoryArn,
              region: regionName,
              createdAt: repo.createdAt?.toISOString(),
              ...(accountId && { accountId })
            }
          };

          imageScanningDisabledFindings.push(finding);
          findings.push(finding);
        }
      }

      // Find publicly accessible repositories
      const publiclyAccessibleRepositories = await findPubliclyAccessibleRepositories(ecrClient, allRepositories);

      if (publiclyAccessibleRepositories.length > 0) {
        for (const repo of publiclyAccessibleRepositories) {
          const finding = {
            id: 'aws_ecr_repository_publicly_accessible',
            key: `aws-ecr-repository-publicly-accessible-${accountId}-${regionName}-${repo.repositoryName}`,
            title: `Amazon ECR Repository Is Publicly Accessible in Region ${regionName}`,
            description: `ECR Repository (${repo.repositoryName}) in region ${regionName} is publicly accessible. Public repositories allow anyone on the internet to pull container images, which may expose sensitive code, internal tooling, or proprietary base images. Only repositories explicitly intended for public use should have this configuration.`,
            additionalInfo: {
              repositoryName: repo.repositoryName,
              repositoryArn: repo.repositoryArn,
              region: regionName,
              createdAt: repo.createdAt?.toISOString(),
              ...(accountId && { accountId })
            }
          };

          publiclyAccessibleRepositoryFindings.push(finding);
          findings.push(finding);
        }
      }
    }

    console.log(`Found ${nonImmutableRepositoryFindings.length} ECR repositories without tag immutability enabled across all regions`);
    console.log(`Found ${noLifecyclePolicyFindings.length} ECR repositories without lifecycle policies configured across all regions`);
    console.log(`Found ${imageScanningDisabledFindings.length} ECR repositories without image scanning enabled across all regions`);
    console.log(`Found ${publiclyAccessibleRepositoryFindings.length} publicly accessible ECR repositories across all regions`);
    return findings;
  } catch (error) {
    console.error('Error finding ECR issues:', error);
    return [];
  }
}


/**
 * Find ECR repositories without image tag immutability enabled
 * @param repositories - List of ECR repositories
 * @returns Array of repositories without tag immutability enabled
 */
function findRepositoriesWithoutTagImmutability(repositories: Repository[]) {
  try {
    // Filter repositories where imageTagMutability is not 'IMMUTABLE'
    const nonImmutableRepositories = repositories.filter(repo => 
      repo.imageTagMutability !== 'IMMUTABLE'
    );

    return nonImmutableRepositories;
  } catch (error) {
    console.error('Error finding repositories without tag immutability:', error);
    return [];
  }
}

/**
 * Find ECR repositories without image scanning enabled
 * @param repositories - List of ECR repositories
 * @returns Array of repositories without image scanning enabled
 */
function findRepositoriesWithoutImageScanning(repositories: Repository[]) {
  try {
    // Filter repositories where imageScanningConfiguration.scanOnPush is not true
    const repositoriesWithoutImageScanning = repositories.filter(repo => 
      !repo.imageScanningConfiguration?.scanOnPush
    );

    return repositoriesWithoutImageScanning;
  } catch (error) {
    console.error('Error finding repositories without image scanning enabled:', error);
    return [];
  }
}

/**
 * Find ECR repositories without lifecycle policies configured
 * @param ecrClient - ECR client
 * @param repositories - List of ECR repositories
 * @returns Array of repositories without lifecycle policies
 */
async function findRepositoriesWithoutLifecyclePolicy(ecrClient: ECRClient, repositories: Repository[]) {
  try {
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

/**
 * Find ECR repositories that are publicly accessible
 * @param ecrClient - ECR client
 * @param repositories - List of ECR repositories
 * @returns Array of publicly accessible repositories
 */
async function findPubliclyAccessibleRepositories(ecrClient: ECRClient, repositories: Repository[]) {
  try {
    const publiclyAccessibleRepositories = [];

    // Check each repository for public access
    for (const repo of repositories) {
      if (!repo.repositoryName) continue;

      try {
        // Try to get the repository policy
        const policyCommand = new GetRepositoryPolicyCommand({
          repositoryName: repo.repositoryName
        });
        const policyResponse = await ecrClient.send(policyCommand);

        // If we have a policy, check if it allows public access
        if (policyResponse.policyText) {
          const policy = JSON.parse(policyResponse.policyText);

          // Check if the policy allows public access
          // This is a simplified check - in a real implementation, you might want to do more thorough analysis
          const isPublic = isRepositoryPolicyPublic(policy);

          if (isPublic) {
            publiclyAccessibleRepositories.push(repo);
          }
        }
      } catch (error) {
        // If we get a RepositoryPolicyNotFoundException, the repository doesn't have a policy
        // which means it's not publicly accessible
        if (!(error instanceof RepositoryPolicyNotFoundException)) {
          console.error(`Error checking repository policy for ${repo.repositoryName}:`, error);
        }
      }
    }

    return publiclyAccessibleRepositories;
  } catch (error) {
    console.error('Error finding publicly accessible repositories:', error);
    return [];
  }
}

/**
 * Check if a repository policy allows public access
 * @param policy - The repository policy
 * @returns boolean indicating if the policy allows public access
 */
function isRepositoryPolicyPublic(policy: any): boolean {
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

/**
 * Get all ECR repositories in a region
 * @param ecrClient - ECR client
 * @returns Array of repositories
 */
async function getAllRepositories(ecrClient: ECRClient): Promise<Repository[]> {
  try {
    const repositories: Repository[] = [];
    let nextToken;

    do {
      const command: DescribeRepositoriesCommand = new DescribeRepositoriesCommand({ nextToken });
      const response = await ecrClient.send(command);

      if (response.repositories) {
        repositories.push(...response.repositories);
      }

      nextToken = response.nextToken;
    } while (nextToken);

    return repositories;
  } catch (error) {
    console.error('Error getting ECR repositories:', error);
    return [];
  }
}
