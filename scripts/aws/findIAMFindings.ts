import { 
  IAMClient, 
  ListUsersCommand, 
  ListUsersCommandOutput,
  ListAccessKeysCommand, 
  ListAccessKeysCommandOutput,
  GetAccessKeyLastUsedCommand,
  GetAccessKeyLastUsedCommandOutput,
  GetUserCommand,
  GetUserCommandOutput,
  ListMFADevicesCommand,
  ListMFADevicesCommandOutput,
  GenerateCredentialReportCommand,
  GetCredentialReportCommand
} from '@aws-sdk/client-iam';

/**
 * Find IAM users with access keys not rotated for more than 90 days,
 * IAM users with access keys that are inactive for over 90 days,
 * IAM users with passwords older than 90 days,
 * IAM users with console access but without MFA enabled,
 * and AWS root user access key usage within the last 90 days
 * @param credentials - AWS credentials
 * @param region - AWS region
 * @returns Array of security findings
 */
export async function findIAMFindings(credentials: any, region: string) {
  try {
    console.log('Finding IAM users with access keys not rotated for more than 90 days, inactive access keys over 90 days, passwords older than 90 days, console users without MFA enabled, and root user access key usage within the last 90 days');

    const iamClient = new IAMClient({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
      }
    });

    // Get all IAM users
    const users = await getAllIAMUsers(iamClient);
    console.log(`Found ${users.length} IAM users`);

    const findings: any[] = [];
    const notRotatedFindings: any[] = [];
    const inactiveFindings: any[] = [];
    const oldPasswordFindings: any[] = [];
    const mfaDisabledFindings: any[] = [];
    const rootUserAccessKeyUsedFindings: any[] = [];
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Check each user's access keys and password age
    for (const user of users) {
      // Skip if UserName is undefined
      if (!user.UserName) continue;

      // Get detailed user information including password last changed date
      const userDetails = await getUserDetails(iamClient, user.UserName);

      // Check if the user has a password (console access)
      if (userDetails?.PasswordLastUsed) {
        const passwordLastUsed = new Date(userDetails.PasswordLastUsed);

        // Check if the password is older than 90 days
        if (passwordLastUsed < ninetyDaysAgo) {
          const oldPasswordFinding = {
            id: 'aws_iam_user_password_older_90_days',
            key: `aws-iam-user-password-older-90-days-${user.UserName}`,
            title: `IAM User (${user.UserName}) with Old Password`,
            description: `IAM user (${user.UserName}) has a password that has not been changed for more than 90 days.`,
            additionalInfo: {
              userName: user.UserName,
              passwordLastUsed: passwordLastUsed.toISOString(),
              ageInDays: Math.floor((new Date().getTime() - passwordLastUsed.getTime()) / (1000 * 60 * 60 * 24))
            }
          };

          oldPasswordFindings.push(oldPasswordFinding);
          findings.push(oldPasswordFinding);
        }

        // Check if the user has MFA enabled
        const hasMFA = await userHasMFA(iamClient, user.UserName);

        // Create a finding if the user doesn't have MFA enabled
        if (!hasMFA) {
          const mfaDisabledFinding = {
            id: 'aws_iam_user_mfa_disabled',
            key: `aws-iam-user-mfa-disabled-${user.UserName}`,
            title: `IAM User (${user.UserName}) without MFA`,
            description: `IAM user (${user.UserName}) has console access but does not have MFA enabled, increasing the risk of unauthorized access if the password is compromised.`,
            additionalInfo: {
              userName: user.UserName,
              passwordLastUsed: passwordLastUsed.toISOString()
            }
          };

          mfaDisabledFindings.push(mfaDisabledFinding);
          findings.push(mfaDisabledFinding);
        }
      }

      const accessKeys = await getUserAccessKeys(iamClient, user.UserName);

      for (const accessKey of accessKeys) {
        // Skip if CreateDate is undefined
        if (!accessKey.CreateDate) continue;

        const createDate = new Date(accessKey.CreateDate);

        // Skip if AccessKeyId is undefined
        if (!accessKey.AccessKeyId) continue;

        // Get last used info for the access key
        const lastUsedInfo = await getAccessKeyLastUsed(iamClient, accessKey.AccessKeyId);

        // Check if the access key is older than 90 days
        if (createDate < ninetyDaysAgo) {
          const notRotatedFinding = {
            id: 'aws_iam_access_key_not_rotated_90_days',
            key: `aws-iam-access-key-not-rotated-90-days-${accessKey.AccessKeyId}`,
            title: `IAM User (${user.UserName}) with old Access Key`,
            description: `IAM user (${user.UserName}) has an access key (${accessKey.AccessKeyId}) that has not been rotated for more than 90 days.`,
            additionalInfo: {
              userName: user.UserName,
              accessKeyId: accessKey.AccessKeyId,
              createDate: createDate.toISOString(),
              status: accessKey.Status,
              lastUsed: lastUsedInfo?.LastUsedDate ? new Date(lastUsedInfo.LastUsedDate).toISOString() : 'Never',
              lastUsedService: lastUsedInfo?.ServiceName || 'N/A',
              lastUsedRegion: lastUsedInfo?.Region || 'N/A',
              ageInDays: Math.floor((new Date().getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24))
            }
          };

          notRotatedFindings.push(notRotatedFinding);
          findings.push(notRotatedFinding);
        }

        // Check if the access key is inactive and has been inactive for over 90 days
        if (accessKey.Status === 'Inactive') {
          // If we have last used info and it's older than 90 days, or if it was never used
          const lastUsedDate = lastUsedInfo?.LastUsedDate ? new Date(lastUsedInfo.LastUsedDate) : null;
          const isOldInactive = lastUsedDate ? lastUsedDate < ninetyDaysAgo : true;

          if (isOldInactive) {
            const inactiveFinding = {
              id: 'aws_iam_access_key_inactive_90_days',
              key: `aws-iam-access-key-inactive-90-days-${accessKey.AccessKeyId}`,
              title: `IAM User (${user.UserName}) with Inactive Access Key`,
              description: `IAM user (${user.UserName}) has an inactive access key (${accessKey.AccessKeyId}) that has been inactive for over 90 days.`,
              additionalInfo: {
                userName: user.UserName,
                accessKeyId: accessKey.AccessKeyId,
                createDate: createDate.toISOString(),
                status: accessKey.Status,
                lastUsed: lastUsedInfo?.LastUsedDate ? new Date(lastUsedInfo.LastUsedDate).toISOString() : 'Never',
                lastUsedService: lastUsedInfo?.ServiceName || 'N/A',
                lastUsedRegion: lastUsedInfo?.Region || 'N/A',
                ageInDays: Math.floor((new Date().getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24)),
                inactiveDays: lastUsedDate ? 
                  Math.floor((new Date().getTime() - lastUsedDate.getTime()) / (1000 * 60 * 60 * 24)) : 
                  Math.floor((new Date().getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24))
              }
            };

            inactiveFindings.push(inactiveFinding);
            findings.push(inactiveFinding);
          }
        }
      }
    }

    // Check for root user access key usage within the last 90 days
    try {
      const rootUserFindings = await checkRootUserAccessKeyUsage(iamClient, ninetyDaysAgo);
      if (rootUserFindings) {
        rootUserAccessKeyUsedFindings.push(rootUserFindings);
        findings.push(rootUserFindings);
      }
    } catch (rootError) {
      console.error('Error checking root user access key usage:', rootError);
    }

    console.log(`Found ${notRotatedFindings.length} IAM users with old access keys, ${inactiveFindings.length} IAM users with inactive access keys over 90 days, ${oldPasswordFindings.length} IAM users with passwords older than 90 days, ${mfaDisabledFindings.length} IAM users with console access but without MFA enabled, and ${rootUserAccessKeyUsedFindings.length} instances of root user access key usage within the last 90 days`);
    return findings;
  } catch (error) {
    console.error('Error finding IAM users with old or inactive access keys, old passwords, without MFA, or root user access key usage:', error);
    return [];
  }
}

/**
 * Get all IAM users
 * @param iamClient - IAM client
 * @returns Array of IAM users
 */
async function getAllIAMUsers(iamClient: IAMClient) {
  try {
    const users = [];
    let marker;

    do {
      const command: ListUsersCommand = new ListUsersCommand({ Marker: marker });
      const response: ListUsersCommandOutput = await iamClient.send(command);

      if (response.Users) {
        users.push(...response.Users);
      }

      marker = response.Marker;
    } while (marker);

    return users;
  } catch (error) {
    console.error('Error getting IAM users:', error);
    return [];
  }
}

/**
 * Get access keys for an IAM user
 * @param iamClient - IAM client
 * @param userName - IAM user name
 * @returns Array of access keys
 */
async function getUserAccessKeys(iamClient: IAMClient, userName: string) {
  try {
    const command: ListAccessKeysCommand = new ListAccessKeysCommand({ UserName: userName });
    const response: ListAccessKeysCommandOutput = await iamClient.send(command);

    return response.AccessKeyMetadata || [];
  } catch (error) {
    console.error(`Error getting access keys for user ${userName}:`, error);
    return [];
  }
}

/**
 * Get last used info for an access key
 * @param iamClient - IAM client
 * @param accessKeyId - Access key ID
 * @returns Last used info
 */
async function getAccessKeyLastUsed(iamClient: IAMClient, accessKeyId: string) {
  try {
    const command: GetAccessKeyLastUsedCommand = new GetAccessKeyLastUsedCommand({ AccessKeyId: accessKeyId });
    const response: GetAccessKeyLastUsedCommandOutput = await iamClient.send(command);

    return response.AccessKeyLastUsed;
  } catch (error) {
    console.error(`Error getting last used info for access key ${accessKeyId}:`, error);
    return null;
  }
}

/**
 * Get detailed information for an IAM user
 * @param iamClient - IAM client
 * @param userName - IAM user name
 * @returns User details including password last changed date
 */
async function getUserDetails(iamClient: IAMClient, userName: string) {
  try {
    const command: GetUserCommand = new GetUserCommand({ UserName: userName });
    const response: GetUserCommandOutput = await iamClient.send(command);

    return response.User;
  } catch (error) {
    console.error(`Error getting details for user ${userName}:`, error);
    return null;
  }
}

/**
 * Check if an IAM user has MFA enabled
 * @param iamClient - IAM client
 * @param userName - IAM user name
 * @returns True if the user has at least one MFA device, false otherwise
 */
async function userHasMFA(iamClient: IAMClient, userName: string) {
  try {
    const command: ListMFADevicesCommand = new ListMFADevicesCommand({ UserName: userName });
    const response: ListMFADevicesCommandOutput = await iamClient.send(command);

    // User has MFA if they have at least one MFA device
    return response.MFADevices && response.MFADevices.length > 0;
  } catch (error) {
    console.error(`Error checking MFA for user ${userName}:`, error);
    return false;
  }
}

/**
 * Generate and get the AWS credential report
 * @param iamClient - IAM client
 * @returns The credential report as a string
 */
async function getCredentialReport(iamClient: IAMClient): Promise<string> {
  try {
    // First, try to get the credential report
    try {
      const getReportCommand = new GetCredentialReportCommand({});
      const getReportResponse = await iamClient.send(getReportCommand);

      if (getReportResponse.Content) {
        // Convert the Buffer to a string
        return Buffer.from(getReportResponse.Content).toString('utf-8');
      }
    } catch (error) {
      // If the report doesn't exist or is expired, generate a new one
      console.log('Credential report not available, generating a new one...');
    }

    // Generate a new credential report
    const generateCommand = new GenerateCredentialReportCommand({});
    let generateResponse = await iamClient.send(generateCommand);

    // Wait for the report to be generated
    while (generateResponse.State === 'STARTED') {
      console.log('Waiting for credential report to be generated...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      generateResponse = await iamClient.send(generateCommand);
    }

    // Get the generated report
    const getReportCommand = new GetCredentialReportCommand({});
    const getReportResponse = await iamClient.send(getReportCommand);

    if (getReportResponse.Content) {
      // Convert the Buffer to a string
      return Buffer.from(getReportResponse.Content).toString('utf-8');
    }

    throw new Error('Failed to get credential report content');
  } catch (error) {
    console.error('Error generating or getting credential report:', error);
    throw error;
  }
}

/**
 * Check if the root user has access keys that have been used within the last 90 days
 * @param iamClient - IAM client
 * @param ninetyDaysAgo - Date object representing 90 days ago
 * @returns A finding object if the root user has access keys that have been used within the last 90 days, null otherwise
 */
async function checkRootUserAccessKeyUsage(iamClient: IAMClient, ninetyDaysAgo: Date): Promise<any | null> {
  try {
    // Get the credential report
    const reportCsv = await getCredentialReport(iamClient);

    // Parse the CSV report
    const lines = reportCsv.split('\n');
    if (lines.length < 2) {
      console.log('Credential report is empty or malformed');
      return null;
    }

    // Get the header line and find the indices of the relevant columns
    const headers = lines[0].split(',');
    const accessKey1LastUsedIndex = headers.indexOf('access_key_1_last_used_date');
    const accessKey2LastUsedIndex = headers.indexOf('access_key_2_last_used_date');
    const userNameIndex = headers.indexOf('user');

    if (accessKey1LastUsedIndex === -1 || accessKey2LastUsedIndex === -1 || userNameIndex === -1) {
      console.log('Credential report is missing required columns');
      return null;
    }

    // Find the root user line
    const rootUserLine = lines.find(line => {
      const columns = line.split(',');
      return columns[userNameIndex] === '<root_account>';
    });

    if (!rootUserLine) {
      console.log('Root user not found in credential report');
      return null;
    }

    // Parse the root user line
    const rootUserColumns = rootUserLine.split(',');
    const accessKey1LastUsed = rootUserColumns[accessKey1LastUsedIndex];
    const accessKey2LastUsed = rootUserColumns[accessKey2LastUsedIndex];

    // Check if either access key has been used within the last 90 days
    let recentlyUsedKey = null;
    let lastUsedDate = null;

    if (accessKey1LastUsed && accessKey1LastUsed !== 'N/A' && accessKey1LastUsed !== 'no_information') {
      const accessKey1Date = new Date(accessKey1LastUsed);
      if (accessKey1Date > ninetyDaysAgo) {
        recentlyUsedKey = 'access_key_1';
        lastUsedDate = accessKey1Date;
      }
    }

    if (!recentlyUsedKey && accessKey2LastUsed && accessKey2LastUsed !== 'N/A' && accessKey2LastUsed !== 'no_information') {
      const accessKey2Date = new Date(accessKey2LastUsed);
      if (accessKey2Date > ninetyDaysAgo) {
        recentlyUsedKey = 'access_key_2';
        lastUsedDate = accessKey2Date;
      }
    }

    // If a key has been used recently, create a finding
    if (recentlyUsedKey && lastUsedDate) {
      const daysAgo = Math.floor((new Date().getTime() - lastUsedDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: 'aws_root_user_access_key_used_90_days',
        key: `aws-root-user-access-key-used-90-days`,
        title: 'AWS Root User Access Key Used within Last 90 Days',
        description: `The AWS root user access key (${recentlyUsedKey}) has been used within the last 90 days, which is a security risk as the root user should only be used for account and service management tasks that require root user access.`,
        additionalInfo: {
          keyId: recentlyUsedKey,
          lastUsedDate: lastUsedDate.toISOString(),
          daysAgo: daysAgo
        }
      };
    }

    return null;
  } catch (error) {
    console.error('Error checking root user access key usage:', error);
    throw error;
  }
}
