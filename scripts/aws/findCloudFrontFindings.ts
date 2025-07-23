import { 
  CloudFrontClient, 
  ListDistributionsCommand, 
  ListDistributionsCommandOutput,
  GetDistributionConfigCommand,
  GetDistributionConfigCommandOutput,
  DistributionConfig
} from '@aws-sdk/client-cloudfront';

/**
 * Find CloudFront distributions without compression enabled
 * @param credentials - AWS credentials
 * @param region - AWS region (CloudFront is a global service, but we need a region for the client)
 * @param accountId - AWS account ID
 * @returns Array of security findings
 */
export async function findCloudFrontFindings(credentials: any, region: string, accountId: string | null = null) {
  try {
    console.log('Finding CloudFront distributions without compression enabled');

    const findings: any[] = [];

    // CloudFront is a global service, so we only need to check one region
    const cloudFrontClient = new CloudFrontClient({
      region: region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
      }
    });

    // Get all CloudFront distributions
    const distributions = await getAllDistributions(cloudFrontClient);
    console.log(`Found ${distributions.length} CloudFront distributions`);

    // Check each distribution for compression settings
    for (const distribution of distributions) {
      // Skip if Id is undefined
      if (!distribution.Id) continue;

      // Get detailed distribution configuration
      const distributionConfig = await getDistributionConfig(cloudFrontClient, distribution.Id);

      // Skip if no config found
      if (!distributionConfig) continue;

      // Check if compression is disabled
      if (!isCompressionEnabled(distributionConfig)) {
        const finding = {
          id: 'aws_cloudfront_distribution_compression_disabled',
          key: `aws-cloudfront-distribution-compression-disabled-${distribution.Id}`,
          title: `CloudFront Distribution Without Compression Enabled`,
          description: `CloudFront distribution (${distribution.DomainName || 'Unknown Domain'}) does not have content compression enabled. Enabling compression reduces data size over the network, improves performance for clients, and lowers data transfer costs.`,
          additionalInfo: {
            distributionId: distribution.Id,
            domainName: distribution.DomainName || 'Unknown',
            enabled: distribution.Enabled || false,
            status: distribution.Status || 'Unknown',
            lastModifiedTime: distribution.LastModifiedTime ? new Date(distribution.LastModifiedTime).toISOString() : 'Unknown',
            ...(accountId && { accountId })
          }
        };

        findings.push(finding);
        console.log(`Found CloudFront distribution without compression enabled: ${distribution.Id}`);
      }
    }

    console.log(`Found ${findings.length} CloudFront distributions without compression enabled`);
    return findings;
  } catch (error) {
    console.error('Error finding CloudFront distributions without compression enabled:', error);
    return [];
  }
}

/**
 * Get all CloudFront distributions
 * @param cloudFrontClient - CloudFront client
 * @returns Array of distribution summaries
 */
async function getAllDistributions(cloudFrontClient: CloudFrontClient) {
  try {
    const distributions = [];
    let marker;

    do {
      const command = new ListDistributionsCommand({ Marker: marker });
      const response: ListDistributionsCommandOutput = await cloudFrontClient.send(command);

      if (response.DistributionList && response.DistributionList.Items) {
        distributions.push(...response.DistributionList.Items);
      }

      marker = response.DistributionList?.NextMarker;
    } while (marker);

    return distributions;
  } catch (error) {
    console.error('Error getting CloudFront distributions:', error);
    return [];
  }
}

/**
 * Get detailed configuration for a CloudFront distribution
 * @param cloudFrontClient - CloudFront client
 * @param distributionId - ID of the distribution
 * @returns Distribution configuration
 */
async function getDistributionConfig(cloudFrontClient: CloudFrontClient, distributionId: string): Promise<DistributionConfig | null> {
  try {
    const command = new GetDistributionConfigCommand({ Id: distributionId });
    const response: GetDistributionConfigCommandOutput = await cloudFrontClient.send(command);

    return response.DistributionConfig || null;
  } catch (error) {
    console.error(`Error getting distribution config for ${distributionId}:`, error);
    return null;
  }
}

/**
 * Check if compression is enabled for a CloudFront distribution
 * @param distributionConfig - Distribution configuration
 * @returns True if compression is enabled, false otherwise
 */
function isCompressionEnabled(distributionConfig: DistributionConfig): boolean {
  // Check if DefaultCacheBehavior has compression enabled
  if (distributionConfig.DefaultCacheBehavior && distributionConfig.DefaultCacheBehavior.Compress === true) {
    return true;
  }

  // Check if any CacheBehaviors have compression enabled
  if (distributionConfig.CacheBehaviors && distributionConfig.CacheBehaviors.Items && distributionConfig.CacheBehaviors.Items.length > 0) {
    for (const cacheBehavior of distributionConfig.CacheBehaviors.Items) {
      if (cacheBehavior.Compress === true) {
        return true;
      }
    }
  }

  // If we get here, compression is not enabled for any cache behavior
  return false;
}