import { 
  RDSClient, 
  DescribeDBInstancesCommand,
  DescribeDBClustersCommand,
  DescribeReservedDBInstancesCommand
} from '@aws-sdk/client-rds';

/**
 * Find RDS instances or clusters running without matching Reserved Instances
 * @param credentials - AWS credentials
 * @param region - AWS region (used to initialize RDS client for listing regions)
 * @param accountId - AWS account ID
 * @param activeRegions - Array of active regions to use
 * @returns Array of security findings
 */
export async function findRDSFindings(credentials: any, region: string, accountId: string | null = null, activeRegions: string[]) {
  try {
    console.log('Finding RDS issues (Reserved Instances, Public Accessibility, Secrets Manager, Deletion Protection)');

    // Use provided active regions or get all AWS regions, excluding disabled ones
    const regions = activeRegions;
    console.log(`Using ${regions.length} AWS regions`);

    const findings: any[] = [];
    const rdsWithoutRIFindings: any[] = [];
    const rdsPubliclyAccessibleFindings: any[] = [];
    const rdsWithoutSecretsManagerFindings: any[] = [];
    const rdsWithoutDeletionProtectionFindings: any[] = [];
    const rdsClustersWithoutDeletionProtectionFindings: any[] = [];

    // Check each region for RDS issues
    for (const regionName of regions) {
      console.log(`Checking region: ${regionName}`);

      const rdsClient = new RDSClient({
        region: regionName,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken
        }
      });

      // Find RDS instances without matching Reserved Instances
      const instancesWithoutRI = await findRDSInstancesWithoutRI(rdsClient);

      if (instancesWithoutRI.length > 0) {
        for (const instance of instancesWithoutRI) {
          const finding = {
            id: 'aws_rds_instance_without_ri',
            key: `aws-rds-instance-without-ri-${accountId}-${regionName}-${instance.DBInstanceIdentifier}`,
            title: `RDS Instance Running Without Matching Reserved Instance in Region ${regionName}`,
            description: `RDS instance (${instance.DBInstanceIdentifier}) in region ${regionName} is running on-demand without a corresponding Reserved Instance (RI) covering its instance type, region, and availability zone. Purchasing RIs for sustained usage can optimize cost efficiency.`,
            additionalInfo: {
              instanceId: instance.DBInstanceIdentifier,
              region: regionName,
              instanceType: instance.DBInstanceClass,
              engine: instance.Engine,
              engineVersion: instance.EngineVersion,
              availabilityZone: instance.AvailabilityZone,
              multiAZ: instance.MultiAZ,
              ...(accountId && { accountId })
            }
          };

          rdsWithoutRIFindings.push(finding);
          findings.push(finding);
        }
      }

      // Find RDS clusters without matching Reserved Instances
      const clustersWithoutRI = await findRDSClustersWithoutRI(rdsClient);

      if (clustersWithoutRI.length > 0) {
        for (const cluster of clustersWithoutRI) {
          const finding = {
            id: 'aws_rds_cluster_without_ri',
            key: `aws-rds-cluster-without-ri-${accountId}-${regionName}-${cluster.DBClusterIdentifier}`,
            title: `RDS Cluster Running Without Matching Reserved Instance in Region ${regionName}`,
            description: `RDS cluster (${cluster.DBClusterIdentifier}) in region ${regionName} is running on-demand without a corresponding Reserved Instance (RI) covering its instance type, region, and availability zone. Purchasing RIs for sustained usage can optimize cost efficiency.`,
            additionalInfo: {
              clusterId: cluster.DBClusterIdentifier,
              region: regionName,
              engine: cluster.Engine,
              engineVersion: cluster.EngineVersion,
              availabilityZones: cluster.AvailabilityZones,
              ...(accountId && { accountId })
            }
          };

          rdsWithoutRIFindings.push(finding);
          findings.push(finding);
        }
      }

      // Find publicly accessible RDS instances
      const publiclyAccessibleInstances = await findPubliclyAccessibleRDSInstances(rdsClient);

      if (publiclyAccessibleInstances.length > 0) {
        for (const instance of publiclyAccessibleInstances) {
          const finding = {
            id: 'aws_rds_instance_publicly_accessible',
            key: `aws-rds-instance-publicly-accessible-${accountId}-${regionName}-${instance.DBInstanceIdentifier}`,
            title: `RDS Instance Is Publicly Accessible in Region ${regionName}`,
            description: `RDS instance (${instance.DBInstanceIdentifier}) in region ${regionName} has the 'PubliclyAccessible' flag set to true. Publicly accessible databases are exposed to the internet, increasing the risk of unauthorized access, data breaches, and denial-of-service attacks. RDS instances should be deployed in private subnets and accessed through secure, internal mechanisms.`,
            additionalInfo: {
              instanceId: instance.DBInstanceIdentifier,
              region: regionName,
              instanceType: instance.DBInstanceClass,
              engine: instance.Engine,
              engineVersion: instance.EngineVersion,
              availabilityZone: instance.AvailabilityZone,
              multiAZ: instance.MultiAZ,
              publiclyAccessible: instance.PubliclyAccessible,
              ...(accountId && { accountId })
            }
          };

          rdsPubliclyAccessibleFindings.push(finding);
          findings.push(finding);
        }
      }

      const instancesWithoutSecretsManager = await findRDSInstancesWithoutSecretsManager(rdsClient);

      if (instancesWithoutSecretsManager.length > 0) {
        for (const instance of instancesWithoutSecretsManager) {
          const finding = {
            id: 'aws_rds_credentials_not_in_secrets_manager',
            key: `aws-rds-credentials-not-in-secrets-manager-${accountId}-${regionName}-${instance.DBInstanceIdentifier}`,
            title: `RDS Root or Master Credentials Not Managed by AWS Secrets Manager in Region ${regionName}`,
            description: `RDS instance (${instance.DBInstanceIdentifier}) in region ${regionName} does not have its master (root) database credentials stored or rotated using AWS Secrets Manager. Managing credentials manually increases the risk of credential sprawl, unauthorized access, and audit non-compliance. Secrets Manager enables secure storage, access control, and automated rotation of RDS credentials.`,
            additionalInfo: {
              instanceId: instance.DBInstanceIdentifier,
              region: regionName,
              instanceType: instance.DBInstanceClass,
              engine: instance.Engine,
              engineVersion: instance.EngineVersion,
              availabilityZone: instance.AvailabilityZone,
              multiAZ: instance.MultiAZ,
              ...(accountId && { accountId })
            }
          };

          rdsWithoutSecretsManagerFindings.push(finding);
          findings.push(finding);
        }
      }

      // Find RDS instances without deletion protection enabled
      const instancesWithoutDeletionProtection = await findRDSInstancesWithoutDeletionProtection(rdsClient);

      if (instancesWithoutDeletionProtection.length > 0) {
        for (const instance of instancesWithoutDeletionProtection) {
          const finding = {
            id: 'aws_rds_instance_without_deletion_protection',
            key: `aws-rds-instance-without-deletion-protection-${accountId}-${regionName}-${instance.DBInstanceIdentifier}`,
            title: `RDS Instance Does Not Have Deletion Protection Enabled in Region ${regionName}`,
            description: `RDS instance (${instance.DBInstanceIdentifier}) in region ${regionName} does not have deletion protection enabled. Without this safeguard, databases can be accidentally or maliciously deleted, leading to data loss, service downtime, and compliance violations. Deletion protection is especially critical for production environments.`,
            additionalInfo: {
              instanceId: instance.DBInstanceIdentifier,
              region: regionName,
              instanceType: instance.DBInstanceClass,
              engine: instance.Engine,
              engineVersion: instance.EngineVersion,
              availabilityZone: instance.AvailabilityZone,
              multiAZ: instance.MultiAZ,
              deletionProtection: instance.DeletionProtection,
              ...(accountId && { accountId })
            }
          };

          rdsWithoutDeletionProtectionFindings.push(finding);
          findings.push(finding);
        }
      }

      // Find RDS clusters without deletion protection enabled
      const clustersWithoutDeletionProtection = await findRDSClustersWithoutDeletionProtection(rdsClient);

      if (clustersWithoutDeletionProtection.length > 0) {
        for (const cluster of clustersWithoutDeletionProtection) {
          const finding = {
            id: 'aws_rds_cluster_without_deletion_protection',
            key: `aws-rds-cluster-without-deletion-protection-${accountId}-${regionName}-${cluster.DBClusterIdentifier}`,
            title: `RDS Cluster Does Not Have Deletion Protection Enabled in Region ${regionName}`,
            description: `RDS cluster (${cluster.DBClusterIdentifier}) in region ${regionName} does not have deletion protection enabled. Without this setting, the entire cluster—including all DB instances and shared storage—can be accidentally or maliciously deleted. Deletion protection is essential for production and business-critical workloads to prevent data loss and downtime.`,
            additionalInfo: {
              clusterId: cluster.DBClusterIdentifier,
              region: regionName,
              engine: cluster.Engine,
              engineVersion: cluster.EngineVersion,
              availabilityZones: cluster.AvailabilityZones,
              deletionProtection: cluster.DeletionProtection,
              ...(accountId && { accountId })
            }
          };

          rdsClustersWithoutDeletionProtectionFindings.push(finding);
          findings.push(finding);
        }
      }
    }

    console.log(`Found ${rdsWithoutRIFindings.length} RDS instances/clusters without matching Reserved Instances across all regions`);
    console.log(`Found ${rdsPubliclyAccessibleFindings.length} publicly accessible RDS instances across all regions`);
    console.log(`Found ${rdsWithoutSecretsManagerFindings.length} RDS instances without AWS Secrets Manager for master credentials across all regions`);
    console.log(`Found ${rdsWithoutDeletionProtectionFindings.length} RDS instances without deletion protection enabled across all regions`);
    console.log(`Found ${rdsClustersWithoutDeletionProtectionFindings.length} RDS clusters without deletion protection enabled across all regions`);
    return findings;
  } catch (error) {
    console.error('Error finding RDS issues:', error);
    return [];
  }
}


/**
 * Find RDS instances without matching Reserved Instances
 * @param rdsClient - RDS client
 * @returns Array of RDS instances without matching Reserved Instances
 */
async function findRDSInstancesWithoutRI(rdsClient: RDSClient) {
  try {
    // Get all active RDS instances
    const instancesCommand = new DescribeDBInstancesCommand({});
    const instancesResponse = await rdsClient.send(instancesCommand);
    const activeInstances = instancesResponse.DBInstances || [];

    // Get all active Reserved Instances
    const reservedInstancesCommand = new DescribeReservedDBInstancesCommand({});
    const reservedInstancesResponse = await rdsClient.send(reservedInstancesCommand);
    const activeReservedInstances = (reservedInstancesResponse.ReservedDBInstances || [])
      .filter(ri => ri.State === 'active');

    // Find instances without matching RIs
    const instancesWithoutRI = activeInstances.filter(instance => {
      // Check if there's a matching RI for this instance
      const matchingRI = activeReservedInstances.find(ri => 
        ri.DBInstanceClass === instance.DBInstanceClass &&
        ri.ProductDescription?.includes(instance.Engine || '') &&
        (
          // Multi-AZ RI matches Multi-AZ instance
          (ri.MultiAZ && instance.MultiAZ) ||
          // Single-AZ RI matches Single-AZ instance
          (!ri.MultiAZ && !instance.MultiAZ)
        )
      );

      // If no matching RI is found, include this instance in the result
      return !matchingRI;
    });

    return instancesWithoutRI;
  } catch (error) {
    console.error('Error finding RDS instances without matching Reserved Instances:', error);
    return [];
  }
}

/**
 * Find RDS clusters without matching Reserved Instances
 * @param rdsClient - RDS client
 * @returns Array of RDS clusters without matching Reserved Instances
 */
async function findRDSClustersWithoutRI(rdsClient: RDSClient) {
  try {
    // Get all active RDS clusters
    const clustersCommand = new DescribeDBClustersCommand({});
    const clustersResponse = await rdsClient.send(clustersCommand);
    const activeClusters = clustersResponse.DBClusters || [];

    // Get all active Reserved Instances
    const reservedInstancesCommand = new DescribeReservedDBInstancesCommand({});
    const reservedInstancesResponse = await rdsClient.send(reservedInstancesCommand);
    const activeReservedInstances = (reservedInstancesResponse.ReservedDBInstances || [])
      .filter(ri => ri.State === 'active');

    // Find clusters without matching RIs
    // For Aurora clusters, we need to check if there are enough RIs to cover all instances in the cluster
    const clustersWithoutRI = activeClusters.filter(cluster => {
      // For Aurora clusters, we need to get the instance details
      const clusterEngine = cluster.Engine || '';
      if (!clusterEngine.includes('aurora')) {
        return false; // Skip non-Aurora clusters
      }

      // Check if there's a matching RI for this cluster
      // For Aurora clusters, we need to check if there are enough RIs to cover all instances in the cluster
      const matchingRIs = activeReservedInstances.filter(ri => 
        ri.ProductDescription?.includes(clusterEngine)
      );

      // If no matching RIs are found, include this cluster in the result
      return matchingRIs.length === 0;
    });

    return clustersWithoutRI;
  } catch (error) {
    console.error('Error finding RDS clusters without matching Reserved Instances:', error);
    return [];
  }
}

/**
 * Find RDS instances that are publicly accessible
 * @param rdsClient - RDS client
 * @returns Array of RDS instances that are publicly accessible
 */
async function findPubliclyAccessibleRDSInstances(rdsClient: RDSClient) {
  try {
    // Get all RDS instances
    const instancesCommand = new DescribeDBInstancesCommand({});
    const instancesResponse = await rdsClient.send(instancesCommand);
    const allInstances = instancesResponse.DBInstances || [];

    // Filter instances that have PubliclyAccessible flag set to true
    const publiclyAccessibleInstances = allInstances.filter(instance => 
      instance.PubliclyAccessible === true
    );

    return publiclyAccessibleInstances;
  } catch (error) {
    console.error('Error finding publicly accessible RDS instances:', error);
    return [];
  }
}

/**
 * Find RDS instances where master credentials are not managed by AWS Secrets Manager
 * @param rdsClient - RDS client
 * @returns Array of RDS instances not using AWS Secrets Manager for master credentials
 */
async function findRDSInstancesWithoutSecretsManager(rdsClient: RDSClient) {
  try {
    // Get all RDS instances
    const instancesCommand = new DescribeDBInstancesCommand({});
    const instancesResponse = await rdsClient.send(instancesCommand);
    const allInstances = instancesResponse.DBInstances || [];

    // Get all RDS clusters
    const clustersCommand = new DescribeDBClustersCommand({});
    const clustersResponse = await rdsClient.send(clustersCommand);
    const allClusters = clustersResponse.DBClusters || [];

    // Create a map of cluster ID to MasterUserSecret status
    const clusterSecretMap = new Map();
    allClusters.forEach(cluster => {
      // If MasterUserSecret exists and has a SecretArn, the cluster is using Secrets Manager
      const isUsingSecretsManager = !!cluster.MasterUserSecret?.SecretArn;
      clusterSecretMap.set(cluster.DBClusterIdentifier, isUsingSecretsManager);
    });

    // Find instances without Secrets Manager
    const instancesWithoutSecrets = allInstances.filter(instance => {
      // If the instance is part of a cluster, check the cluster's MasterUserSecret status
      if (instance.DBClusterIdentifier) {
        const clusterUsingSecretsManager = clusterSecretMap.get(instance.DBClusterIdentifier);
        // If we know the cluster is using Secrets Manager, this instance is covered
        if (clusterUsingSecretsManager === true) {
          return false;
        }
      }

      // For standalone instances, check if the instance itself has MasterUserSecret
      if (instance.MasterUserSecret?.SecretArn) {
        return false;
      }

      // If we reach here, the instance is not using Secrets Manager
      return true;
    });

    return instancesWithoutSecrets;
  } catch (error) {
    console.error('Error finding RDS instances without Secrets Manager:', error);
    return [];
  }
}

/**
 * Find RDS instances that do not have deletion protection enabled
 * @param rdsClient - RDS client
 * @returns Array of RDS instances without deletion protection enabled
 */
async function findRDSInstancesWithoutDeletionProtection(rdsClient: RDSClient) {
  try {
    // Get all RDS instances
    const instancesCommand = new DescribeDBInstancesCommand({});
    const instancesResponse = await rdsClient.send(instancesCommand);
    const allInstances = instancesResponse.DBInstances || [];

    // Filter instances that have DeletionProtection flag set to false
    const instancesWithoutDeletionProtection = allInstances.filter(instance => 
      instance.DeletionProtection === false
    );

    return instancesWithoutDeletionProtection;
  } catch (error) {
    console.error('Error finding RDS instances without deletion protection:', error);
    return [];
  }
}

/**
 * Find RDS clusters that do not have deletion protection enabled
 * @param rdsClient - RDS client
 * @returns Array of RDS clusters without deletion protection enabled
 */
async function findRDSClustersWithoutDeletionProtection(rdsClient: RDSClient) {
  try {
    // Get all RDS clusters
    const clustersCommand = new DescribeDBClustersCommand({});
    const clustersResponse = await rdsClient.send(clustersCommand);
    const allClusters = clustersResponse.DBClusters || [];

    // Filter clusters that have DeletionProtection flag set to false
    const clustersWithoutDeletionProtection = allClusters.filter(cluster => 
      cluster.DeletionProtection === false
    );

    return clustersWithoutDeletionProtection;
  } catch (error) {
    console.error('Error finding RDS clusters without deletion protection:', error);
    return [];
  }
}
