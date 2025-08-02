import { 
  Route53Client, 
  ListHostedZonesCommand, 
  ListHostedZonesCommandOutput,
  GetHostedZoneCommand,
  GetHostedZoneCommandOutput,
  HostedZone,
  ListResourceRecordSetsCommand,
  ListResourceRecordSetsCommandOutput,
  ResourceRecordSet
} from '@aws-sdk/client-route-53';
import * as dns from 'dns';
import { promisify } from 'util';

// Promisify the dns.resolve function
const dnsResolve = promisify(dns.resolve);

/**
 * Find Route 53 public hosted zones that are not resolvable via public DNS
 * @param credentials - AWS credentials
 * @param region - AWS region (used to initialize Route53 client)
 * @param accountId - AWS account ID
 * @param activeRegions - Array of active regions to use
 * @returns Array of security findings
 */
export async function findRoute53Findings(credentials: any, region: string, accountId: string | null = null, activeRegions: string[]) {
  try {
    console.log('Finding Route 53 public hosted zones that are not resolvable via public DNS');

    const findings: any[] = [];

    // Route 53 is a global service, so we only need to check one region
    const route53Client = new Route53Client({
      region: region, // Route 53 is global, but we need to specify a region for the client
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
      }
    });

    // Get all hosted zones
    const hostedZones = await getAllHostedZones(route53Client);
    console.log(`Found ${hostedZones.length} hosted zones`);

    // Check each hosted zone
    for (const hostedZone of hostedZones) {
      // Skip if Id is undefined
      if (!hostedZone.Id) continue;

      // Get detailed hosted zone information
      const zoneDetail = await getHostedZoneDetails(route53Client, hostedZone.Id);

      // Skip if no details found or if it's not a public hosted zone
      if (!zoneDetail || !zoneDetail.HostedZone || zoneDetail.HostedZone.Config?.PrivateZone) continue;

      // Get the domain name from the hosted zone
      const domainName = hostedZone.Name ? hostedZone.Name.replace(/\.$/, '') : '';
      if (!domainName) continue;

      // Get the NS records for the hosted zone
      const nsRecords = await getNSRecords(route53Client, hostedZone.Id, domainName);

      console.log(`Found ${nsRecords.length} NS records for ${domainName}`);

      // Skip if no NS records found
      if (!nsRecords || nsRecords.length === 0) continue;

      // Check if the NS records from Route 53 match the NS records resolved via public DNS
      const isResolvable = await doNSRecordsMatch(domainName, nsRecords);

      if (!isResolvable) {
        const finding = {
          id: 'aws_route53_public_hosted_zone_not_resolvable',
          key: `aws-route53-public-hosted-zone-not-resolvable-${hostedZone.Id.split('/').pop()}`,
          title: `Route 53 Public Hosted Zone Not Resolvable via Public DNS`,
          description: `Route 53 public hosted zone (${domainName}) is not resolvable via public DNS resolvers. This may indicate missing or incorrect delegation, expired domain registration, or propagation delays.`,
          additionalInfo: {
            hostedZoneId: hostedZone.Id,
            domainName: domainName,
            nameServers: nsRecords.map(record => record.ResourceRecords?.map(rr => rr.Value).join(', ')).filter(Boolean),
            callerReference: hostedZone.CallerReference || 'Unknown',
            resourceRecordSetCount: hostedZone.ResourceRecordSetCount || 0,
            ...(accountId && { accountId })
          }
        };

        findings.push(finding);
        console.log(`Found non-resolvable public hosted zone: ${domainName}`);
      }
    }

    console.log(`Found ${findings.length} non-resolvable public hosted zones`);
    return findings;
  } catch (error) {
    console.error('Error finding Route 53 public hosted zones not resolvable via public DNS:', error);
    return [];
  }
}

/**
 * Get all hosted zones
 * @param route53Client - Route 53 client
 * @returns Array of hosted zones
 */
async function getAllHostedZones(route53Client: Route53Client) {
  try {
    const hostedZones = [];
    let marker;

    do {
      const command = new ListHostedZonesCommand({ Marker: marker });
      const response: ListHostedZonesCommandOutput = await route53Client.send(command);

      if (response.HostedZones) {
        hostedZones.push(...response.HostedZones);
      }

      marker = response.Marker;
    } while (marker);

    return hostedZones;
  } catch (error) {
    console.error('Error getting hosted zones:', error);
    return [];
  }
}

/**
 * Get detailed information about a hosted zone
 * @param route53Client - Route 53 client
 * @param hostedZoneId - ID of the hosted zone
 * @returns Hosted zone details
 */
async function getHostedZoneDetails(route53Client: Route53Client, hostedZoneId: string): Promise<GetHostedZoneCommandOutput | null> {
  try {
    const command = new GetHostedZoneCommand({ Id: hostedZoneId });
    const response: GetHostedZoneCommandOutput = await route53Client.send(command);

    return response || null;
  } catch (error) {
    console.error(`Error getting hosted zone details for ${hostedZoneId}:`, error);
    return null;
  }
}

/**
 * Get NS records for a hosted zone
 * @param route53Client - Route 53 client
 * @param hostedZoneId - ID of the hosted zone
 * @param hostedZoneName
 * @returns Array of NS records
 */
async function getNSRecords(route53Client: Route53Client, hostedZoneId: string, hostedZoneName: string): Promise<ResourceRecordSet[]> {
  try {
    const command = new ListResourceRecordSetsCommand({
      HostedZoneId: hostedZoneId,
      StartRecordType: 'NS',
      StartRecordName: hostedZoneName
    });

    const response: ListResourceRecordSetsCommandOutput = await route53Client.send(command);

    if (!response.ResourceRecordSets) return [];

    // Filter for NS records at the apex (root) of the domain
    return response.ResourceRecordSets.filter(record => (record.Type === 'NS' && (record.Name === hostedZoneName || record.Name === `${hostedZoneName}.`)));
  } catch (error) {
    console.error(`Error getting NS records for ${hostedZoneId}:`, error);
    return [];
  }
}

/**
 * Check if NS records from Route 53 match the NS records resolved via public DNS
 * @param domainName - Domain name to check
 * @param route53NSRecords - NS records from Route 53
 * @returns True if the NS records match, false otherwise
 */
async function doNSRecordsMatch(domainName: string, route53NSRecords: ResourceRecordSet[]): Promise<boolean> {
  // Save the original DNS servers
  const originalServers = dns.getServers();

  var isNSMatched = false
  try {
    // Set DNS servers to Google's DNS (8.8.8.8) or Cloudflare's DNS (1.1.1.1)
    dns.setServers(['8.8.8.8', '1.1.1.1']);

    // Try to resolve NS records first to check if they match Route 53
    const resolvedNSRecords = await dnsResolve(domainName, 'NS');

    // Extract NS values from Route 53 records
    const route53NSValues = route53NSRecords
      .filter(record => record.Type === 'NS')
      .flatMap(record => record.ResourceRecords || [])
      .map(rr => rr.Value?.toLowerCase().replace(/\.$/, ''))
      .filter(Boolean) as string[];

    // Normalize resolved NS records (lowercase and remove trailing dots)
    const normalizedResolvedNS = resolvedNSRecords.map(ns => ns.toLowerCase().replace(/\.$/, ''));

    // Check if the NS records match
    const nsMatch = route53NSValues.length > 0 &&
                    normalizedResolvedNS.length > 0 &&
                    route53NSValues.every(ns => normalizedResolvedNS.includes(ns));

    if (nsMatch) {
      isNSMatched = true;
    } else {
      console.log(`NS records don't match for ${domainName}. Route 53: ${route53NSValues.join(', ')}. Resolved: ${normalizedResolvedNS.join(', ')}`);
    }

  } catch (error) {
      console.log(`Error resolving NS records for ${domainName}:`, error);
  } finally {
    // Restore the original DNS servers
    dns.setServers(originalServers);
  }

  return isNSMatched
}
