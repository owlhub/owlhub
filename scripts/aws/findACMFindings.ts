import { 
  ACMClient, 
  ListCertificatesCommand, 
  ListCertificatesCommandOutput,
  DescribeCertificateCommand,
  DescribeCertificateCommandOutput,
  CertificateDetail
} from '@aws-sdk/client-acm';
import { EC2Client, DescribeRegionsCommand } from '@aws-sdk/client-ec2';

/**
 * Find ACM certificate issues (expired, expiring within 30 days, or having domain wildcards) in all AWS regions
 * @param credentials - AWS credentials
 * @param region - AWS region (used to initialize EC2 client for listing regions)
 * @returns Array of security findings
 */
export async function findACMFindings(credentials: any, region: string, accountId: string | null = null) {
  try {
    console.log('Finding ACM certificate issues (expired, expiring within 30 days, or having domain wildcards) in all AWS regions');

    // Get all AWS regions
    const regions = await getAllRegions(credentials, region);
    console.log(`Found ${regions.length} AWS regions`);

    const findings: any[] = [];

    // Check each region for expired certificates
    for (const regionName of regions) {
      console.log(`Checking region: ${regionName}`);

      const acmClient = new ACMClient({
        region: regionName,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken
        }
      });

      // Get all certificates in the region
      const certificates = await getAllCertificates(acmClient);
      console.log(`Found ${certificates.length} certificates in region ${regionName}`);

      // Check each certificate
      for (const certificate of certificates) {
        // Skip if CertificateArn is undefined
        if (!certificate.CertificateArn) continue;

        // Get detailed certificate information
        const certDetail = await getCertificateDetails(acmClient, certificate.CertificateArn);

        // Skip if no details found
        if (!certDetail) continue;

        // Check if the certificate is expired
        if (isExpired(certDetail)) {
          const finding = {
            id: 'aws_acm_certificate_expired',
            key: `aws-acm-certificate-expired-${certificate.CertificateArn.split('/').pop()}`,
            title: `Expired ACM Certificate in ${regionName}`,
            description: `ACM certificate (${certDetail.DomainName || 'Unknown Domain'}) has expired.`,
            additionalInfo: {
              certificateArn: certificate.CertificateArn,
              domainName: certDetail.DomainName || 'Unknown',
              region: regionName,
              status: certDetail.Status || 'Unknown',
              notBefore: certDetail.NotBefore ? new Date(certDetail.NotBefore).toISOString() : 'Unknown',
              notAfter: certDetail.NotAfter ? new Date(certDetail.NotAfter).toISOString() : 'Unknown',
              issuer: certDetail.Issuer || 'Unknown',
              keyAlgorithm: certDetail.KeyAlgorithm || 'Unknown',
              inUseBy: certDetail.InUseBy || [],
              type: certDetail.Type || 'Unknown',
              renewalEligibility: certDetail.RenewalEligibility || 'Unknown',
              ...(accountId && { accountId })
            }
          };

          findings.push(finding);
          console.log(`Found expired certificate: ${certDetail.DomainName || 'Unknown Domain'} in region ${regionName}`);
        }
        // Check if the certificate expires within 30 days
        else if (expiresWithin30Days(certDetail)) {
          const finding = {
            id: 'aws_acm_certificate_expires_within_30_days',
            key: `aws-acm-certificate-expires-soon-${certificate.CertificateArn.split('/').pop()}`,
            title: `ACM Certificate Expiring Soon in ${regionName}`,
            description: `ACM certificate (${certDetail.DomainName || 'Unknown Domain'}) will expire within 30 days.`,
            additionalInfo: {
              certificateArn: certificate.CertificateArn,
              domainName: certDetail.DomainName || 'Unknown',
              region: regionName,
              status: certDetail.Status || 'Unknown',
              notBefore: certDetail.NotBefore ? new Date(certDetail.NotBefore).toISOString() : 'Unknown',
              notAfter: certDetail.NotAfter ? new Date(certDetail.NotAfter).toISOString() : 'Unknown',
              issuer: certDetail.Issuer || 'Unknown',
              keyAlgorithm: certDetail.KeyAlgorithm || 'Unknown',
              inUseBy: certDetail.InUseBy || [],
              type: certDetail.Type || 'Unknown',
              renewalEligibility: certDetail.RenewalEligibility || 'Unknown',
              daysUntilExpiry: certDetail.NotAfter ? 
                Math.ceil((new Date(certDetail.NotAfter).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
                'Unknown',
              ...(accountId && { accountId })
            }
          };

          findings.push(finding);
          console.log(`Found certificate expiring soon: ${certDetail.DomainName || 'Unknown Domain'} in region ${regionName}`);
        }

        // Check if the certificate has a domain wildcard
        if (hasDomainWildcard(certDetail)) {
          const finding = {
            id: 'aws_acm_certificate_has_domain_wildcard',
            key: `aws-acm-certificate-wildcard-${certificate.CertificateArn.split('/').pop()}`,
            title: `ACM Certificate with Domain Wildcard in ${regionName}`,
            description: `ACM certificate (${certDetail.DomainName || 'Unknown Domain'}) has a domain wildcard.`,
            additionalInfo: {
              certificateArn: certificate.CertificateArn,
              domainName: certDetail.DomainName || 'Unknown',
              region: regionName,
              status: certDetail.Status || 'Unknown',
              notBefore: certDetail.NotBefore ? new Date(certDetail.NotBefore).toISOString() : 'Unknown',
              notAfter: certDetail.NotAfter ? new Date(certDetail.NotAfter).toISOString() : 'Unknown',
              issuer: certDetail.Issuer || 'Unknown',
              keyAlgorithm: certDetail.KeyAlgorithm || 'Unknown',
              inUseBy: certDetail.InUseBy || [],
              type: certDetail.Type || 'Unknown',
              renewalEligibility: certDetail.RenewalEligibility || 'Unknown',
              subjectAlternativeNames: certDetail.SubjectAlternativeNames || [],
              ...(accountId && { accountId })
            }
          };

          findings.push(finding);
          console.log(`Found certificate with domain wildcard: ${certDetail.DomainName || 'Unknown Domain'} in region ${regionName}`);
        }
      }
    }

    // Count findings by type
    const expiredCount = findings.filter(f => f.id === 'aws_acm_certificate_expired').length;
    const expiringCount = findings.filter(f => f.id === 'aws_acm_certificate_expires_within_30_days').length;
    const wildcardCount = findings.filter(f => f.id === 'aws_acm_certificate_has_domain_wildcard').length;

    console.log(`Found ${expiredCount} expired, ${expiringCount} expiring soon, and ${wildcardCount} with domain wildcards ACM certificates across all regions`);
    return findings;
  } catch (error) {
    console.error('Error finding ACM certificate issues:', error);
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
 * Get all certificates in a region
 * @param acmClient - ACM client
 * @returns Array of certificate summaries
 */
async function getAllCertificates(acmClient: ACMClient) {
  try {
    const certificates = [];
    let nextToken;

    do {
      const command = new ListCertificatesCommand({ NextToken: nextToken });
      const response: ListCertificatesCommandOutput = await acmClient.send(command);

      if (response.CertificateSummaryList) {
        certificates.push(...response.CertificateSummaryList);
      }

      nextToken = response.NextToken;
    } while (nextToken);

    return certificates;
  } catch (error) {
    console.error('Error getting certificates:', error);
    return [];
  }
}

/**
 * Get detailed information about a certificate
 * @param acmClient - ACM client
 * @param certificateArn - ARN of the certificate
 * @returns Certificate details
 */
async function getCertificateDetails(acmClient: ACMClient, certificateArn: string): Promise<CertificateDetail | null> {
  try {
    const command = new DescribeCertificateCommand({ CertificateArn: certificateArn });
    const response: DescribeCertificateCommandOutput = await acmClient.send(command);

    return response.Certificate || null;
  } catch (error) {
    console.error(`Error getting certificate details for ${certificateArn}:`, error);
    return null;
  }
}

/**
 * Check if a certificate is expired
 * @param certificate - Certificate details
 * @returns True if the certificate is expired, false otherwise
 */
function isExpired(certificate: CertificateDetail): boolean {
  // If NotAfter is undefined, we can't determine if it's expired
  if (!certificate.NotAfter) return false;

  const now = new Date();
  const expiryDate = new Date(certificate.NotAfter);

  return now > expiryDate;
}

/**
 * Check if a certificate expires within 30 days
 * @param certificate - Certificate details
 * @returns True if the certificate expires within 30 days, false otherwise
 */
function expiresWithin30Days(certificate: CertificateDetail): boolean {
  // If NotAfter is undefined, we can't determine if it's expiring soon
  if (!certificate.NotAfter) return false;

  const now = new Date();
  const expiryDate = new Date(certificate.NotAfter);

  // If already expired, return false
  if (now > expiryDate) return false;

  // Calculate date 30 days from now
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  // Return true if expiry date is before or equal to 30 days from now
  return expiryDate <= thirtyDaysFromNow;
}

/**
 * Check if a certificate has a domain wildcard
 * @param certificate - Certificate details
 * @returns True if the certificate has a domain wildcard, false otherwise
 */
function hasDomainWildcard(certificate: CertificateDetail): boolean {
  // Check the main domain name
  if (certificate.DomainName && certificate.DomainName.includes('*')) {
    return true;
  }

  // Check alternative domain names
  if (certificate.SubjectAlternativeNames) {
    for (const domain of certificate.SubjectAlternativeNames) {
      if (domain.includes('*')) {
        return true;
      }
    }
  }

  return false;
}
