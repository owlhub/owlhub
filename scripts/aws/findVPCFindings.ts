import { 
  EC2Client, 
  DescribeVpcsCommand, 
  DescribeFlowLogsCommand,
  DescribeInternetGatewaysCommand,
  DescribeRouteTablesCommand,
  DescribeSubnetsCommand,
  DescribeNetworkInterfacesCommand,
  DescribeVpcEndpointsCommand,
  DescribeVpcPeeringConnectionsCommand
} from '@aws-sdk/client-ec2';

/**
 * Find VPC issues in all AWS regions
 * @param credentials - AWS credentials
 * @param region - AWS region (used to initialize EC2 client for listing regions)
 * @param accountId - AWS account ID
 * @param activeRegions - Array of active regions to use
 * @returns Array of security findings
 */
export async function findVPCFindings(credentials: any, region: string, accountId: string | null = null, activeRegions: string[]) {
  try {
    console.log('Finding VPC issues in all AWS regions');

    // Use provided active regions or get all AWS regions, excluding disabled ones
    const regions = activeRegions;
    console.log(`Using ${regions.length} AWS regions`);

    const findings: any[] = [];
    const defaultVpcFindings: any[] = [];
    const flowLogsNotEnabledFindings: any[] = [];
    const igwNotRoutedFindings: any[] = [];
    const igwNotAttachedFindings: any[] = [];
    const unusedRouteTableFindings: any[] = [];
    const emptyVpcFindings: any[] = [];
    const blackholeRouteFindings: any[] = [];
    const noEniResourcesFindings: any[] = [];
    const missingGatewayEndpointFindings: any[] = [];
    const publicSubnetFindings: any[] = [];
    const peeringDnsResolutionDisabledFindings: any[] = [];

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

        if (vpc.OwnerId === accountId) {
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

        // Check if the VPC has any ENI-provisioning resources
        const hasEniResources = await checkVpcHasEniResources(ec2Client, vpc.VpcId);

        if (!hasEniResources) {
          const finding = {
            id: 'aws_vpc_no_eni_resources',
            key: `aws-vpc-no-eni-resources-${accountId}-${regionName}-${vpc.VpcId}`,
            title: `VPC Does Not Contain Any ENI-Provisioning Resource in Region ${regionName}`,
            description: `VPC (${vpc.VpcId}) in region ${regionName} does not host any active resource capable of provisioning an Elastic Network Interface (ENI). This includes EC2 instances, RDS, NAT Gateways, Load Balancers, Lambda functions (in VPC), and other services that generate ENIs. Empty VPCs may be stale, misconfigured, or safe to delete.`,
            additionalInfo: {
              vpcId: vpc.VpcId,
              region: regionName,
              cidrBlock: vpc.CidrBlock,
              ...(accountId && { accountId })
            }
          };

          noEniResourcesFindings.push(finding);
          findings.push(finding);
        }

        // Skip gateway endpoint check for VPCs if owner is different
        if (vpc.OwnerId === accountId) {
          // Get all Gateway Endpoints in the region
          const gatewayEndpoints = await findGatewayEndpoints(ec2Client);

          // Check if the VPC has Gateway Endpoints for S3 and DynamoDB
          const vpcEndpoints = gatewayEndpoints.filter(endpoint => 
            endpoint.VpcId === vpc.VpcId
          );

          const hasS3Endpoint = vpcEndpoints.some(endpoint => 
            endpoint.ServiceName && endpoint.ServiceName.includes('s3')
          );

          const hasDynamoDBEndpoint = vpcEndpoints.some(endpoint => 
            endpoint.ServiceName && endpoint.ServiceName.includes('dynamodb')
          );

          // If the VPC is missing either S3 or DynamoDB Gateway Endpoint, create a finding
          if (!hasS3Endpoint || !hasDynamoDBEndpoint) {
            const missingServices = [];
            if (!hasS3Endpoint) missingServices.push('S3');
            if (!hasDynamoDBEndpoint) missingServices.push('DynamoDB');

            const finding = {
              id: 'aws_vpc_missing_gateway_endpoint',
              key: `aws-vpc-missing-gateway-endpoint-${accountId}-${regionName}-${vpc.VpcId}`,
              title: `VPC Missing Gateway Endpoint for ${missingServices.join(' and ')} in Region ${regionName}`,
              description: `VPC (${vpc.VpcId}) in region ${regionName} does not have a Gateway Endpoint for ${missingServices.join(' and ')}. Without endpoint routing, access defaults to public internet paths, potentially increasing security risks and incurring NAT Gateway data processing charges. Using Gateway Endpoints ensures secure, private access from within the VPC.`,
              additionalInfo: {
                vpcId: vpc.VpcId,
                region: regionName,
                cidrBlock: vpc.CidrBlock,
                missingEndpoints: missingServices,
                existingEndpoints: vpcEndpoints.map(endpoint => ({
                  endpointId: endpoint.VpcEndpointId,
                  serviceName: endpoint.ServiceName,
                  state: endpoint.State
                })),
                ...(accountId && { accountId })
              }
            };

            missingGatewayEndpointFindings.push(finding);
            findings.push(finding);
          }
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

        // Check for blackhole routes in the route table
        const blackholeRoutes = findBlackholeRoutes(routeTable);

        if (blackholeRoutes.length > 0) {
          const destinationCidrs = blackholeRoutes.map(route => route.DestinationCidrBlock || route.DestinationIpv6CidrBlock || 'Unknown').join(', ');

          const finding = {
            id: 'aws_vpc_blackhole_routes',
            key: `aws-vpc-blackhole-routes-${accountId}-${regionName}-${routeTable.RouteTableId}`,
            title: `Blackhole Routes in VPC Route Table in Region ${regionName}`,
            description: `Route table (${routeTable.RouteTableId}) in region ${regionName} has blackhole routes, which may be caused by deleted or misconfigured targets. Affected destinations: ${destinationCidrs}`,
            additionalInfo: {
              routeTableId: routeTable.RouteTableId,
              region: regionName,
              vpcId: routeTable.VpcId,
              blackholeRoutes: blackholeRoutes.map(route => ({
                destinationCidr: route.DestinationCidrBlock || route.DestinationIpv6CidrBlock || 'Unknown',
                targetType: getRouteTargetType(route)
              })),
              ...(accountId && { accountId })
            }
          };

          blackholeRouteFindings.push(finding);
          findings.push(finding);
        }

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

      // Find subnets with auto-assign public IPv4 addresses enabled
      const publicSubnets = await findSubnetsWithAutoAssignPublicIP(ec2Client);

      if (publicSubnets.length > 0) {
        for (const subnet of publicSubnets) {
          const finding = {
            id: 'aws_vpc_subnet_auto_assign_public_ip',
            key: `aws-vpc-subnet-auto-assign-public-ip-${accountId}-${regionName}-${subnet.SubnetId}`,
            title: `VPC Subnet Is Configured to Auto-Assign Public IPv4 Addresses in Region ${regionName}`,
            description: `Subnet (${subnet.SubnetId}) in region ${regionName} has the auto-assign public IPv4 address setting enabled. This setting causes EC2 instances launched into the subnet to receive a public IP by default, which may expose them to the internet unless security groups and route tables are tightly controlled. It is recommended to disable this setting for private subnets.`,
            additionalInfo: {
              subnetId: subnet.SubnetId,
              vpcId: subnet.VpcId,
              region: regionName,
              availabilityZone: subnet.AvailabilityZone,
              cidrBlock: subnet.CidrBlock,
              ...(accountId && { accountId })
            }
          };

          publicSubnetFindings.push(finding);
          findings.push(finding);
        }
      }

      // Find VPC peering connections without DNS resolution enabled on both sides
      const peeringConnectionsWithoutDnsResolution = await findVpcPeeringConnectionsWithoutDnsResolution(ec2Client);

      if (peeringConnectionsWithoutDnsResolution.length > 0) {
        for (const peeringConnection of peeringConnectionsWithoutDnsResolution) {
          const finding = {
            id: 'aws_vpc_peering_dns_resolution_disabled',
            key: `aws-vpc-peering-dns-resolution-disabled-${accountId}-${regionName}-${peeringConnection.VpcPeeringConnectionId}`,
            title: `VPC Peering Connection Does Not Have DNS Resolution Enabled on Both Sides in Region ${regionName}`,
            description: `VPC Peering Connection (${peeringConnection.VpcPeeringConnectionId}) in region ${regionName} does not have DNS resolution enabled for either the requester or acceptor VPC. Without this setting, private DNS names from one VPC cannot resolve to IP addresses in the peered VPC, which may break internal service discovery and name resolution for applications.`,
            additionalInfo: {
              peeringConnectionId: peeringConnection.VpcPeeringConnectionId,
              region: regionName,
              requesterVpcId: peeringConnection.RequesterVpcInfo?.VpcId,
              accepterVpcId: peeringConnection.AccepterVpcInfo?.VpcId,
              requesterDnsResolutionEnabled: peeringConnection.RequesterVpcInfo?.PeeringOptions?.AllowDnsResolutionFromRemoteVpc,
              accepterDnsResolutionEnabled: peeringConnection.AccepterVpcInfo?.PeeringOptions?.AllowDnsResolutionFromRemoteVpc,
              status: peeringConnection.Status?.Code,
              ...(accountId && { accountId })
            }
          };

          peeringDnsResolutionDisabledFindings.push(finding);
          findings.push(finding);
        }
      }
    }

    console.log(`Found ${defaultVpcFindings.length} default VPCs across all regions`);
    console.log(`Found ${flowLogsNotEnabledFindings.length} VPCs without flow logs across all regions`);
    console.log(`Found ${emptyVpcFindings.length} empty VPCs without subnets across all regions`);
    console.log(`Found ${noEniResourcesFindings.length} VPCs without ENI-provisioning resources across all regions`);
    console.log(`Found ${missingGatewayEndpointFindings.length} VPCs without Gateway Endpoints for S3 or DynamoDB across all regions`);
    console.log(`Found ${igwNotAttachedFindings.length} Internet Gateways not attached to any VPC across all regions`);
    console.log(`Found ${igwNotRoutedFindings.length} Internet Gateways not properly routed across all regions`);
    console.log(`Found ${unusedRouteTableFindings.length} unused route tables across all regions`);
    console.log(`Found ${blackholeRouteFindings.length} route tables with blackhole routes across all regions`);
    console.log(`Found ${publicSubnetFindings.length} subnets with auto-assign public IPv4 addresses enabled across all regions`);
    console.log(`Found ${peeringDnsResolutionDisabledFindings.length} VPC peering connections without DNS resolution enabled on both sides across all regions`);
    return findings;
  } catch (error) {
    console.error('Error finding VPC issues:', error);
    return [];
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

/**
 * Check if a VPC has any ENI-provisioning resources
 * @param ec2Client - EC2 client
 * @param vpcId - VPC ID to check
 * @returns True if the VPC has any ENI-provisioning resources, false otherwise
 */
async function checkVpcHasEniResources(ec2Client: EC2Client, vpcId: string) {
  try {
    const command = new DescribeNetworkInterfacesCommand({
      Filters: [
        {
          Name: 'vpc-id',
          Values: [vpcId]
        }
      ]
    });

    const response = await ec2Client.send(command);

    // If there are any network interfaces for this VPC, return true
    return (response.NetworkInterfaces && response.NetworkInterfaces.length > 0);
  } catch (error) {
    console.error(`Error checking ENI resources for VPC ${vpcId}:`, error);
    // In case of error, we'll assume the VPC might have ENI resources
    return true;
  }
}

/**
 * Check if a route table has blackhole routes
 * @param routeTable - Route table object
 * @returns Array of blackhole routes found in the route table
 */
function findBlackholeRoutes(routeTable: any) {
  const blackholeRoutes: any[] = [];

  // Check if the route table has routes
  if (routeTable.Routes && routeTable.Routes.length > 0) {
    // Check each route for blackhole state
    for (const route of routeTable.Routes) {
      if (route.State === 'blackhole') {
        blackholeRoutes.push(route);
      }
    }
  }

  return blackholeRoutes;
}

/**
 * Get the type of target for a route
 * @param route - Route object
 * @returns String describing the type of target
 */
function getRouteTargetType(route: any): string {
  if (route.GatewayId) {
    if (route.GatewayId.startsWith('igw-')) {
      return 'Internet Gateway';
    } else if (route.GatewayId.startsWith('vgw-')) {
      return 'Virtual Private Gateway';
    } else if (route.GatewayId.startsWith('tgw-')) {
      return 'Transit Gateway';
    } else if (route.GatewayId === 'local') {
      return 'Local';
    }
    return `Gateway (${route.GatewayId})`;
  } else if (route.NatGatewayId) {
    return 'NAT Gateway';
  } else if (route.InstanceId) {
    return 'EC2 Instance';
  } else if (route.VpcPeeringConnectionId) {
    return 'VPC Peering Connection';
  } else if (route.NetworkInterfaceId) {
    return 'Network Interface';
  } else if (route.TransitGatewayId) {
    return 'Transit Gateway';
  } else if (route.EgressOnlyInternetGatewayId) {
    return 'Egress Only Internet Gateway';
  } else if (route.CarrierGatewayId) {
    return 'Carrier Gateway';
  } else if (route.LocalGatewayId) {
    return 'Local Gateway';
  } else if (route.VpcEndpointId) {
    return 'VPC Endpoint';
  }

  return 'Unknown';
}

/**
 * Find all Gateway Endpoints in a region
 * @param ec2Client - EC2 client
 * @returns Array of Gateway Endpoints
 */
async function findGatewayEndpoints(ec2Client: EC2Client) {
  try {
    const command = new DescribeVpcEndpointsCommand({
      Filters: [
        {
          Name: 'vpc-endpoint-type',
          Values: ['Gateway']
        }
      ]
    });

    const response = await ec2Client.send(command);
    return response.VpcEndpoints || [];
  } catch (error) {
    console.error('Error finding Gateway Endpoints:', error);
    return [];
  }
}

/**
 * Find subnets with auto-assign public IPv4 addresses enabled
 * @param ec2Client - EC2 client
 * @returns Array of subnets with auto-assign public IPv4 addresses enabled
 */
async function findSubnetsWithAutoAssignPublicIP(ec2Client: EC2Client) {
  try {
    const command = new DescribeSubnetsCommand({});
    const response = await ec2Client.send(command);

    // Filter subnets where MapPublicIpOnLaunch is true (auto-assign public IPv4 is enabled)
    const publicSubnets = (response.Subnets || []).filter(subnet => 
      subnet.MapPublicIpOnLaunch === true
    );

    return publicSubnets;
  } catch (error) {
    console.error('Error finding subnets with auto-assign public IPv4 addresses enabled:', error);
    return [];
  }
}

/**
 * Find VPC peering connections without DNS resolution enabled on both sides
 * @param ec2Client - EC2 client
 * @returns Array of VPC peering connections without DNS resolution enabled on both sides
 */
async function findVpcPeeringConnectionsWithoutDnsResolution(ec2Client: EC2Client) {
  try {
    const command = new DescribeVpcPeeringConnectionsCommand({});
    const response = await ec2Client.send(command);

    // Filter peering connections where DNS resolution is not enabled for either the requester or acceptor VPC
    // Only consider active peering connections
    const peeringConnectionsWithoutDnsResolution = (response.VpcPeeringConnections || []).filter(peering => {
      // Only consider active peering connections
      if (peering.Status?.Code !== 'active') {
        return false;
      }

      // Check if DNS resolution is enabled for both requester and acceptor VPCs
      const requesterDnsResolutionEnabled = peering.RequesterVpcInfo?.PeeringOptions?.AllowDnsResolutionFromRemoteVpc;
      const accepterDnsResolutionEnabled = peering.AccepterVpcInfo?.PeeringOptions?.AllowDnsResolutionFromRemoteVpc;

      // If either side doesn't have DNS resolution enabled, include this peering connection in the results
      return !requesterDnsResolutionEnabled || !accepterDnsResolutionEnabled;
    });

    return peeringConnectionsWithoutDnsResolution;
  } catch (error) {
    console.error('Error finding VPC peering connections without DNS resolution enabled:', error);
    return [];
  }
}
