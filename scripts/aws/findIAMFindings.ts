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
  ListMFADevicesCommandOutput
} from '@aws-sdk/client-iam';

/**
 * Find IAM users with access keys not rotated for more than 90 days,
 * IAM users with access keys that are inactive for over 90 days,
 * IAM users with passwords older than 90 days,
 * and IAM users with console access but without MFA enabled
 * @param credentials - AWS credentials
 * @param region - AWS region
 * @returns Array of security findings
 */
export async function findIAMFindings(credentials: any, region: string) {
  try {
    console.log('Finding IAM users with access keys not rotated for more than 90 days, inactive access keys over 90 days, passwords older than 90 days, and console users without MFA enabled');

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

    console.log(`Found ${notRotatedFindings.length} IAM users with old access keys, ${inactiveFindings.length} IAM users with inactive access keys over 90 days, ${oldPasswordFindings.length} IAM users with passwords older than 90 days, and ${mfaDisabledFindings.length} IAM users with console access but without MFA enabled`);
    return findings;
  } catch (error) {
    console.error('Error finding IAM users with old or inactive access keys, old passwords, or without MFA:', error);
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
