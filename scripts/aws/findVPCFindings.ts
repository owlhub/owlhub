import { 
  EC2Client, 
  DescribeVpcsCommand, 
  DescribeRegionsCommand,
  DescribeFlowLogsCommand,
  DescribeInternetGatewaysCommand,
  DescribeRouteTablesCommand,
  DescribeSubnetsCommand
} from '@aws-sdk/client-ec2';

/**
 * Find VPC issues in all AWS regions
 * @param credentials - AWS credentials
 * @param region - AWS region (used to initialize EC2 client for listing regions)
 * @param accountId - AWS account ID
 * @returns Array of security findings
 */
export async function findVPCFindings(credentials: any, region: string, accountId: string | null = null) {
  try {
    console.log('Finding VPC issues in all AWS regions');

    // Get all AWS regions
    const regions = await getAllRegions(credentials, region);
    console.log(`Found ${regions.length} AWS regions`);

    const findings: any[] = [];
    const defaultVpcFindings: any[] = [];
    const flowLogsNotEnabledFindings: any[] = [];
    const igwNotRoutedFindings: any[] = [];
    const igwNotAttachedFindings: any[] = [];
    const unusedRouteTableFindings: any[] = [];
    const emptyVpcFindings: any[] = [];

    // Check each region for VPC issues
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

      // Check for default VPCs
      const defaultVpcs = await findDefaultVpcs(ec2Client);

      if (defaultVpcs.length > 0) {
        for (const vpc of defaultVpcs) {
          const finding = {
            id: 'aws_vpc_default_vpc_exists',
            key: `aws-vpc-default-vpc-exists-${accountId}-${regionName}-${vpc.VpcId}`,
            title: `Default VPC Exists in Region ${regionName}`,
            description: `Default VPC (${vpc.VpcId}) exists in region ${regionName}. Default VPCs are automatically created and may be over-permissive. It's recommended to delete them if unused.`,
            additionalInfo: {
              vpcId: vpc.VpcId,
              region: regionName,
              cidrBlock: vpc.CidrBlock,
              ...(accountId && { accountId })
            }
          };

          defaultVpcFindings.push(finding);
          findings.push(finding);
        }
      }

      // Check for VPCs without flow logs
      const allVpcs = await findAllVpcs(ec2Client);

      for (const vpc of allVpcs) {
        if (!vpc.VpcId) continue;

        const hasFlowLogs = await checkVpcHasFlowLogs(ec2Client, vpc.VpcId);

        if (!hasFlowLogs) {
          const finding = {
            id: 'aws_vpc_flow_logs_not_enabled',
            key: `aws-vpc-flow-logs-not-enabled-${accountId}-${regionName}-${vpc.VpcId}`,
            title: `VPC Flow Logs Not Enabled in Region ${regionName}`,
            description: `VPC (${vpc.VpcId}) in region ${regionName} does not have Flow Logs enabled, reducing the ability to monitor and audit network activity.`,
            additionalInfo: {
              vpcId: vpc.VpcId,
              region: regionName,
              cidrBlock: vpc.CidrBlock,
              ...(accountId && { accountId })
            }
          };

          flowLogsNotEnabledFindings.push(finding);
          findings.push(finding);
        }

        // Check if the VPC has any subnets
        const hasSubnets = await checkVpcHasSubnets(ec2Client, vpc.VpcId);

        if (!hasSubnets) {
          const finding = {
            id: 'aws_vpc_empty_without_subnets',
            key: `aws-vpc-empty-without-subnets-${accountId}-${regionName}-${vpc.VpcId}`,
            title: `Empty VPC Without Subnets in Region ${regionName}`,
            description: `VPC (${vpc.VpcId}) in region ${regionName} does not contain any subnets, which may indicate unused or abandoned resources.`,
            additionalInfo: {
              vpcId: vpc.VpcId,
              region: regionName,
              cidrBlock: vpc.CidrBlock,
              ...(accountId && { accountId })
            }
          };

          emptyVpcFindings.push(finding);
          findings.push(finding);
        }
      }

      // Check for Internet Gateways not connected to any route table
      const allInternetGateways = await findAllInternetGateways(ec2Client);

      for (const igw of allInternetGateways) {
        if (!igw.InternetGatewayId) continue;

        // Check if the Internet Gateway is attached to any VPC
        const isAttached = checkIgwAttachedToVpc(igw);

        if (!isAttached) {
          const finding = {
            id: 'aws_vpc_igw_not_attached_to_vpc',
            key: `aws-vpc-igw-not-attached-to-vpc-${accountId}-${regionName}-${igw.InternetGatewayId}`,
            title: `Internet Gateway Not Attached to VPC in Region ${regionName}`,
            description: `Internet Gateway (${igw.InternetGatewayId}) in region ${regionName} is not connected to any vpc, indicating possible unused setup.`,
            additionalInfo: {
              igwId: igw.InternetGatewayId,
              region: regionName,
              ...(accountId && { accountId })
            }
          };

          igwNotAttachedFindings.push(finding);
          findings.push(finding);
        } else {
          const isConnected = await checkIgwConnectedToRouteTable(ec2Client, igw.InternetGatewayId);

          if (!isConnected) {
            const finding = {
              id: 'aws_vpc_igw_not_properly_routed',
              key: `aws-vpc-igw-not-properly-routed-${accountId}-${regionName}-${igw.InternetGatewayId}`,
              title: `Internet Gateway Not Properly Routed in Region ${regionName}`,
              description: `Internet Gateway (${igw.InternetGatewayId}) in region ${regionName} is not connected to any route table, indicating possible misconfiguration or unused setup.`,
              additionalInfo: {
                igwId: igw.InternetGatewayId,
                region: regionName,
                ...(accountId && { accountId })
              }
            };

            igwNotRoutedFindings.push(finding);
            findings.push(finding);
          }
        }
      }

      // Check for route tables not associated with any subnet
      const allRouteTables = await findAllRouteTables(ec2Client);

      for (const routeTable of allRouteTables) {
        if (!routeTable.RouteTableId) continue;

        // Skip the main route table for VPCs as they're expected to exist
        if (routeTable.Associations && routeTable.Associations.some(assoc => assoc.Main === true)) {
          continue;
        }

        const isAssociated = isRouteTableAssociatedWithSubnet(routeTable);

        if (!isAssociated) {
          const finding = {
            id: 'aws_vpc_unused_route_table',
            key: `aws-vpc-unused-route-table-${accountId}-${regionName}-${routeTable.RouteTableId}`,
            title: `Unused Route Table Detected in Region ${regionName}`,
            description: `Route table (${routeTable.RouteTableId}) in region ${regionName} is not associated with any subnet, which could be a cleanup candidate.`,
            additionalInfo: {
              routeTableId: routeTable.RouteTableId,
              region: regionName,
              vpcId: routeTable.VpcId,
              ...(accountId && { accountId })
            }
          };

          unusedRouteTableFindings.push(finding);
          findings.push(finding);
        }
      }
    }

    console.log(`Found ${defaultVpcFindings.length} default VPCs across all regions`);
    console.log(`Found ${flowLogsNotEnabledFindings.length} VPCs without flow logs across all regions`);
    console.log(`Found ${emptyVpcFindings.length} empty VPCs without subnets across all regions`);
    console.log(`Found ${igwNotAttachedFindings.length} Internet Gateways not attached to any VPC across all regions`);
    console.log(`Found ${igwNotRoutedFindings.length} Internet Gateways not properly routed across all regions`);
    console.log(`Found ${unusedRouteTableFindings.length} unused route tables across all regions`);
    return findings;
  } catch (error) {
    console.error('Error finding VPC issues:', error);
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
 * Find default VPCs in a region
 * @param ec2Client - EC2 client
 * @returns Array of default VPCs
 */
async function findDefaultVpcs(ec2Client: EC2Client) {
  try {
    const command = new DescribeVpcsCommand({
      Filters: [
        {
          Name: 'isDefault',
          Values: ['true']
        }
      ]
    });

    const response = await ec2Client.send(command);
    return response.Vpcs || [];
  } catch (error) {
    console.error('Error finding default VPCs:', error);
    return [];
  }
}

/**
 * Find all VPCs in a region
 * @param ec2Client - EC2 client
 * @returns Array of all VPCs
 */
async function findAllVpcs(ec2Client: EC2Client) {
  try {
    const command = new DescribeVpcsCommand({});

    const response = await ec2Client.send(command);
    return response.Vpcs || [];
  } catch (error) {
    console.error('Error finding all VPCs:', error);
    return [];
  }
}

/**
 * Check if a VPC has flow logs enabled
 * @param ec2Client - EC2 client
 * @param vpcId - VPC ID to check
 * @returns True if the VPC has flow logs enabled, false otherwise
 */
async function checkVpcHasFlowLogs(ec2Client: EC2Client, vpcId: string) {
  try {
    const command = new DescribeFlowLogsCommand({
      Filter: [
        {
          Name: 'resource-id',
          Values: [vpcId]
        }
      ]
    });

    const response = await ec2Client.send(command);

    // If there are any flow logs for this VPC, return true
    return (response.FlowLogs && response.FlowLogs.length > 0);
  } catch (error) {
    console.error(`Error checking flow logs for VPC ${vpcId}:`, error);
    // In case of error, we'll assume flow logs might not be enabled
    return false;
  }
}

/**
 * Find all Internet Gateways in a region
 * @param ec2Client - EC2 client
 * @returns Array of all Internet Gateways
 */
async function findAllInternetGateways(ec2Client: EC2Client) {
  try {
    const command = new DescribeInternetGatewaysCommand({});

    const response = await ec2Client.send(command);
    return response.InternetGateways || [];
  } catch (error) {
    console.error('Error finding Internet Gateways:', error);
    return [];
  }
}

/**
 * Check if an Internet Gateway is connected to any route table
 * @param ec2Client - EC2 client
 * @param igwId - Internet Gateway ID to check
 * @returns True if the Internet Gateway is connected to any route table, false otherwise
 */
async function checkIgwConnectedToRouteTable(ec2Client: EC2Client, igwId: string) {
  try {
    const command = new DescribeRouteTablesCommand({});

    const response = await ec2Client.send(command);

    // Check if any route table has a route to this Internet Gateway
    if (response.RouteTables && response.RouteTables.length > 0) {
      for (const routeTable of response.RouteTables) {
        if (routeTable.Routes) {
          for (const route of routeTable.Routes) {
            if (route.GatewayId === igwId) {
              return true;
            }
          }
        }
      }
    }

    // If no route table has a route to this Internet Gateway, return false
    return false;
  } catch (error) {
    console.error(`Error checking if Internet Gateway ${igwId} is connected to any route table:`, error);
    // In case of error, we'll assume the Internet Gateway might not be connected
    return false;
  }
}

/**
 * Check if an Internet Gateway is attached to any VPC
 * @param igw - Internet Gateway object
 * @returns True if the Internet Gateway is attached to any VPC, false otherwise
 */
function checkIgwAttachedToVpc(igw: any) {
  console.log("IGW: ", JSON.stringify(igw))

  // Check if the Internet Gateway has any attachments
  if (igw.Attachments && igw.Attachments.length > 0) {
    // Check if any attachment is in the 'attached' state
    for (const attachment of igw.Attachments) {
      if (attachment.State === 'available' && attachment.VpcId) {
        return true;
      }
    }
  }

  // If no attachments or no 'attached' attachments, return false
  return false;
}

/**
 * Find all route tables in a region
 * @param ec2Client - EC2 client
 * @returns Array of all route tables
 */
async function findAllRouteTables(ec2Client: EC2Client) {
  try {
    const command = new DescribeRouteTablesCommand({});

    const response = await ec2Client.send(command);
    return response.RouteTables || [];
  } catch (error) {
    console.error('Error finding route tables:', error);
    return [];
  }
}

/**
 * Check if a route table is associated with any subnet
 * @param routeTable - Route table object
 * @returns True if the route table is associated with any subnet, false otherwise
 */
function isRouteTableAssociatedWithSubnet(routeTable: any) {
  // Check if the route table has any associations
  if (routeTable.Associations && routeTable.Associations.length > 0) {
    // Check if any association is with a subnet
    for (const association of routeTable.Associations) {
      if (association.SubnetId) {
        return true;
      }
    }
  }

  // If no associations or no subnet associations, return false
  return false;
}

/**
 * Check if a VPC has any subnets
 * @param ec2Client - EC2 client
 * @param vpcId - VPC ID to check
 * @returns True if the VPC has any subnets, false otherwise
 */
async function checkVpcHasSubnets(ec2Client: EC2Client, vpcId: string) {
  try {
    const command = new DescribeSubnetsCommand({
      Filters: [
        {
          Name: 'vpc-id',
          Values: [vpcId]
        }
      ]
    });

    const response = await ec2Client.send(command);

    // If there are any subnets for this VPC, return true
    return (response.Subnets && response.Subnets.length > 0);
  } catch (error) {
    console.error(`Error checking subnets for VPC ${vpcId}:`, error);
    // In case of error, we'll assume the VPC might have subnets
    return true;
  }
}
