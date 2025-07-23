import { 
  EC2Client, 
  DescribeVolumesCommand,
  DescribeRegionsCommand,
  Volume
} from '@aws-sdk/client-ec2';

/**
 * Find EBS volumes using gp2 instead of gp3 in all AWS regions
 * @param credentials - AWS credentials
 * @param region - AWS region (used to initialize EC2 client for listing regions)
 * @param accountId - AWS account ID
 * @returns Array of findings
 */
export async function findEBSFindings(credentials: any, region: string, accountId: string | null = null) {
  try {
    console.log('Finding EBS volumes using gp2 instead of gp3 in all AWS regions');

    // Get all AWS regions
    const regions = await getAllRegions(credentials, region);
    console.log(`Found ${regions.length} AWS regions`);

    const findings: any[] = [];
    const gp2VolumeFindings: any[] = [];

    // Check each region for gp2 volumes
    for (const regionName of regions) {
      console.log(`Checking region: ${regionName}`);

      const ec2Client = new EC2Client({
        region: regionName,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken
        }
      });

      // Find gp2 volumes
      const gp2Volumes = await findGP2Volumes(ec2Client);

      if (gp2Volumes.length > 0) {
        for (const volume of gp2Volumes) {
          const finding = {
            id: 'aws_ebs_gp2_volumes',
            key: `aws-ebs-gp2-volume-${accountId}-${regionName}-${volume.VolumeId}`,
            title: `EBS Volume Using gp2 Instead of gp3 in Region ${regionName}`,
            description: `EBS volume (${volume.VolumeId}) in region ${regionName} is using the gp2 volume type. AWS recommends migrating to gp3 for better performance tuning and lower cost. gp3 offers higher baseline performance, separate IOPS/bandwidth configuration, and up to 20% cost savings compared to gp2.`,
            additionalInfo: {
              volumeId: volume.VolumeId,
              region: regionName,
              size: volume.Size,
              state: volume.State,
              createTime: volume.CreateTime ? new Date(volume.CreateTime).toISOString() : 'Unknown',
              availabilityZone: volume.AvailabilityZone,
              encrypted: volume.Encrypted,
              iops: volume.Iops,
              attachments: volume.Attachments?.map(attachment => ({
                instanceId: attachment.InstanceId,
                state: attachment.State,
                attachTime: attachment.AttachTime ? new Date(attachment.AttachTime).toISOString() : 'Unknown',
                device: attachment.Device
              })) || [],
              ...(accountId && { accountId })
            }
          };

          gp2VolumeFindings.push(finding);
          findings.push(finding);
        }
      }
    }

    console.log(`Found ${gp2VolumeFindings.length} EBS volumes using gp2 instead of gp3 across all regions`);
    return findings;
  } catch (error) {
    console.error('Error finding EBS volumes using gp2 instead of gp3:', error);
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
 * Find EBS volumes using gp2 in a region
 * @param ec2Client - EC2 client
 * @returns Array of gp2 volumes
 */
async function findGP2Volumes(ec2Client: EC2Client): Promise<Volume[]> {
  try {
    const gp2Volumes: Volume[] = [];
    let nextToken: string | undefined;

    do {
      const command = new DescribeVolumesCommand({
        Filters: [
          {
            Name: 'volume-type',
            Values: ['gp2']
          }
        ],
        NextToken: nextToken
      });

      const response = await ec2Client.send(command);
      
      if (response.Volumes && response.Volumes.length > 0) {
        gp2Volumes.push(...response.Volumes);
      }
      
      nextToken = response.NextToken;
    } while (nextToken);

    return gp2Volumes;
  } catch (error) {
    console.error('Error finding gp2 volumes:', error);
    return [];
  }
}