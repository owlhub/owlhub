import { 
  EC2Client, 
  DescribeNetworkInterfacesCommand,
  DescribeAddressesCommand,
  DescribeSecurityGroupsCommand
} from '@aws-sdk/client-ec2';

/**
 * Find EC2 issues in all AWS regions
 * @param credentials - AWS credentials
 * @param region - AWS region (used to initialize EC2 client for listing regions)
 * @param accountId - AWS account ID
 * @param activeRegions - Array of active regions to use
 * @returns Array of security findings
 */
export async function findEC2Findings(credentials: any, region: string, accountId: string | null = null, activeRegions: string[]) {
  try {
    console.log('Finding EC2 issues in all AWS regions');

    // Use the provided active regions
    const regions = activeRegions;
    console.log(`Using ${regions.length} AWS regions`);

    const findings: any[] = [];
    const unattachedEniFindings: any[] = [];
    const unattachedEipFindings: any[] = [];
    const unattachedSecurityGroupFindings: any[] = [];

    // Check each region for EC2 issues
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

      // Find unattached ENIs
      const unattachedENIs = await findUnattachedENIs(ec2Client);

      if (unattachedENIs.length > 0) {
        for (const eni of unattachedENIs) {
          const finding = {
            id: 'aws_ec2_unattached_eni',
            key: `aws-ec2-unattached-eni-${accountId}-${regionName}-${eni.NetworkInterfaceId}`,
            title: `Unattached Elastic Network Interface (ENI) in Region ${regionName}`,
            description: `Elastic Network Interface (${eni.NetworkInterfaceId}) in region ${regionName} is not attached to any resource such as EC2 instances, Lambda functions, NAT Gateways, or Load Balancers. Unattached ENIs may indicate leftover infrastructure from terminated resources and should be reviewed for cleanup.`,
            additionalInfo: {
              eniId: eni.NetworkInterfaceId,
              region: regionName,
              vpcId: eni.VpcId,
              subnetId: eni.SubnetId,
              availabilityZone: eni.AvailabilityZone,
              description: eni.Description,
              status: eni.Status,
              privateIpAddress: eni.PrivateIpAddress,
              ...(accountId && { accountId })
            }
          };

          unattachedEniFindings.push(finding);
          findings.push(finding);
        }
      }

      // Find unattached Elastic IPs
      const unattachedEIPs = await findUnattachedElasticIPs(ec2Client);

      if (unattachedEIPs.length > 0) {
        for (const eip of unattachedEIPs) {
          const finding = {
            id: 'aws_ec2_unattached_eip',
            key: `aws-ec2-unattached-eip-${accountId}-${regionName}-${eip.AllocationId}`,
            title: `Elastic IP Allocated but Not Attached to Any Resource in Region ${regionName}`,
            description: `Elastic IP (${eip.PublicIp}) in region ${regionName} is allocated but not associated with any EC2 instance, NAT Gateway, or ENI. These unassociated EIPs incur hourly charges and can consume quota unnecessarily. They should be released or reassigned to avoid waste.`,
            additionalInfo: {
              eipId: eip.AllocationId,
              publicIp: eip.PublicIp,
              region: regionName,
              domain: eip.Domain,
              ...(accountId && { accountId })
            }
          };

          unattachedEipFindings.push(finding);
          findings.push(finding);
        }
      }

      // Find security groups that are not attached to any resource
      const unattachedSecurityGroups = await findUnattachedSecurityGroups(ec2Client);

      if (unattachedSecurityGroups.length > 0) {
        for (const sg of unattachedSecurityGroups) {
          const finding = {
            id: 'aws_security_group_not_attached',
            key: `aws-security-group-not-attached-${accountId}-${regionName}-${sg.GroupId}`,
            title: `Security Group Not Attached to Any Resource in Region ${regionName}`,
            description: `Security Group (${sg.GroupId}) in region ${regionName} is not associated with any active resource such as EC2 instances, ENIs, Load Balancers, RDS instances, or Lambda functions. Unused security groups create unnecessary clutter and may cause confusion or lead to accidental reuse of insecure rules. These should be reviewed and deleted if not needed.`,
            additionalInfo: {
              securityGroupId: sg.GroupId,
              securityGroupName: sg.GroupName,
              vpcId: sg.VpcId,
              region: regionName,
              description: sg.Description,
              ...(accountId && { accountId })
            }
          };

          unattachedSecurityGroupFindings.push(finding);
          findings.push(finding);
        }
      }
    }

    console.log(`Found ${unattachedEniFindings.length} unattached ENIs across all regions`);
    console.log(`Found ${unattachedEipFindings.length} unattached Elastic IPs across all regions`);
    console.log(`Found ${unattachedSecurityGroupFindings.length} unattached security groups across all regions`);
    return findings;
  } catch (error) {
    console.error('Error finding EC2 issues:', error);
    return [];
  }
}


/**
 * Find unattached ENIs in a region
 * @param ec2Client - EC2 client
 * @returns Array of unattached ENIs
 */
async function findUnattachedENIs(ec2Client: EC2Client) {
  try {
    const command = new DescribeNetworkInterfacesCommand({
      Filters: [
        {
          Name: 'status',
          Values: ['available'] // 'available' status means the ENI is not attached to any resource
        }
      ]
    });

    const response = await ec2Client.send(command);
    return response.NetworkInterfaces || [];
  } catch (error) {
    console.error('Error finding unattached ENIs:', error);
    return [];
  }
}

/**
 * Find unattached Elastic IPs in a region
 * @param ec2Client - EC2 client
 * @returns Array of unattached Elastic IPs
 */
async function findUnattachedElasticIPs(ec2Client: EC2Client) {
  try {
    const command = new DescribeAddressesCommand({});

    const response = await ec2Client.send(command);

    // Filter out Elastic IPs that are not associated with any resource
    // An unassociated EIP will have no AssociationId
    const unattachedEIPs = (response.Addresses || []).filter(eip => !eip.AssociationId);

    return unattachedEIPs;
  } catch (error) {
    console.error('Error finding unattached Elastic IPs:', error);
    return [];
  }
}

/**
 * Find security groups that are not attached to any resource
 * @param ec2Client - EC2 client
 * @returns Array of unattached security groups
 */
async function findUnattachedSecurityGroups(ec2Client: EC2Client) {
  try {
    const command = new DescribeSecurityGroupsCommand({});
    const response = await ec2Client.send(command);

    // Filter out security groups that are not associated with any resource
    // A security group is considered unattached if it has no references in its usage
    const unattachedSecurityGroups = (response.SecurityGroups || []).filter(sg => {
      // Skip the default security group which is always present
      if (sg.GroupName === 'default') {
        return false;
      }

      // Check if the security group has any references
      // If a security group is in use, it will have references in its usage
      return !sg.IpPermissions?.some(perm => perm.UserIdGroupPairs && perm.UserIdGroupPairs.length > 0) &&
             !sg.IpPermissionsEgress?.some(perm => perm.UserIdGroupPairs && perm.UserIdGroupPairs.length > 0);
    });

    return unattachedSecurityGroups;
  } catch (error) {
    console.error('Error finding unattached security groups:', error);
    return [];
  }
}
