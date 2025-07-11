import { 
  RDSClient, 
  DescribeDBInstancesCommand,
  DescribeDBClustersCommand,
  DescribeReservedDBInstancesCommand
} from '@aws-sdk/client-rds';
import { DescribeRegionsCommand, EC2Client } from '@aws-sdk/client-ec2';

/**
 * Find RDS instances or clusters running without matching Reserved Instances
 * @param credentials - AWS credentials
 * @param region - AWS region (used to initialize RDS client for listing regions)
 * @param accountId - AWS account ID
 * @returns Array of security findings
 */
export async function findRDSFindings(credentials: any, region: string, accountId: string | null = null) {
  try {
    console.log('Finding RDS instances or clusters running without matching Reserved Instances');

    // Get all AWS regions
    const regions = await getAllRegions(credentials, region);
    console.log(`Found ${regions.length} AWS regions`);

    const findings: any[] = [];
    const rdsWithoutRIFindings: any[] = [];

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
    }

    console.log(`Found ${rdsWithoutRIFindings.length} RDS instances/clusters without matching Reserved Instances across all regions`);
    return findings;
  } catch (error) {
    console.error('Error finding RDS issues:', error);
    return [];
  }
}

/**
 * Get all AWS regions
 * @param credentials - AWS credentials
 * @param region - AWS region to initialize the EC2 client
 * @returns Array of region names
 */
async function getAllRegions(credentials: any, region: string): Promise<string[]> {
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
      return [region];
    }

    return response.Regions
      .filter(r => r.RegionName)
      .map(r => r.RegionName as string);
  } catch (error) {
    console.error('Error getting AWS regions:', error);
    // Return the provided region as fallback
    return [region];
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
