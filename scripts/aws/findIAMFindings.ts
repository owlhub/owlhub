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
  GetCredentialReportCommand,
  GetAccountPasswordPolicyCommand,
  GetAccountPasswordPolicyCommandOutput,
  ListRolesCommand,
  ListRolesCommandOutput,
  GetRoleCommand,
  GetRoleCommandOutput
} from '@aws-sdk/client-iam';

/**
 * Find IAM users with access keys not rotated for more than 90 days,
 * IAM users with access keys that are inactive for over 90 days,
 * IAM users with passwords older than 90 days,
 * IAM users with console access but without MFA enabled,
 * AWS root user access key usage within the last 90 days,
 * check if IAM account password policy exists,
 * check if IAM account password policy minimum length is less than 8,
 * check if IAM account password policy max age is greater than 90 days,
 * check if IAM account password policy re-use prevention is less than 5,
 * and check for IAM roles with cross-account access
 * @param credentials - AWS credentials
 * @param region - AWS region
 * @param accountId - AWS account ID
 * @param activeRegions - Array of active regions to use
 * @returns Array of security findings
 */
export async function findIAMFindings(credentials: any, region: string, accountId: string | null = null, activeRegions: string[]) {
  try {
    console.log('Finding IAM users with access keys not rotated for more than 90 days, inactive access keys over 90 days, passwords older than 90 days, console users without MFA enabled, root user access key usage within the last 90 days, checking if IAM account password policy exists, checking if IAM account password policy minimum length is less than 8, checking if IAM account password policy max age is greater than 90 days, checking if IAM account password policy re-use prevention is less than 5, and checking for IAM roles with cross-account access');

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
    const rootUserMFADisabledFindings: any[] = [];
    const rootUserHasAccessKeysFindings: any[] = [];
    const rootUserLoggedInFindings: any[] = [];
    const passwordPolicyFindings: any[] = [];
    const inactiveConsoleLoginFindings: any[] = [];
    const crossAccountRoleFindings: any[] = [];
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
              ageInDays: Math.floor((new Date().getTime() - passwordLastUsed.getTime()) / (1000 * 60 * 60 * 24)),
              ...(accountId && { accountId })
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
              passwordLastUsed: passwordLastUsed.toISOString(),
              ...(accountId && { accountId })
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
              ageInDays: Math.floor((new Date().getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24)),
              ...(accountId && { accountId })
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
                  Math.floor((new Date().getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24)),
                ...(accountId && { accountId })
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
      const rootUserFindings = await checkRootUserAccessKeyUsage(iamClient, ninetyDaysAgo, accountId);
      if (rootUserFindings) {
        rootUserAccessKeyUsedFindings.push(rootUserFindings);
        findings.push(rootUserFindings);
      }
    } catch (rootError) {
      console.error('Error checking root user access key usage:', rootError);
    }

    // Check if root user has MFA enabled
    try {
      const rootUserMFAFinding = await checkRootUserMFADisabled(iamClient, accountId);
      if (rootUserMFAFinding) {
        rootUserMFADisabledFindings.push(rootUserMFAFinding);
        findings.push(rootUserMFAFinding);
      }
    } catch (rootMFAError) {
      console.error('Error checking root user MFA status:', rootMFAError);
    }

    // Check if root user has access keys
    try {
      const rootUserHasAccessKeysFinding = await checkRootUserHasAccessKeys(iamClient, accountId);
      if (rootUserHasAccessKeysFinding) {
        rootUserHasAccessKeysFindings.push(rootUserHasAccessKeysFinding);
        findings.push(rootUserHasAccessKeysFinding);
      }
    } catch (rootAccessKeysError) {
      console.error('Error checking if root user has access keys:', rootAccessKeysError);
    }

    // Check if root user has logged in within the last 90 days
    try {
      const rootUserLoggedInFinding = await checkRootUserLoggedInWithin90Days(iamClient, ninetyDaysAgo, accountId);
      if (rootUserLoggedInFinding) {
        rootUserLoggedInFindings.push(rootUserLoggedInFinding);
        findings.push(rootUserLoggedInFinding);
      }
    } catch (rootLoggedInError) {
      console.error('Error checking if root user has logged in within the last 90 days:', rootLoggedInError);
    }

    // Check for IAM users with console logins inactive over 90 days
    try {
      const inactiveConsoleLogins = await checkIAMUserConsoleLoginInactive(iamClient, ninetyDaysAgo, accountId);
      if (inactiveConsoleLogins.length > 0) {
        inactiveConsoleLoginFindings.push(...inactiveConsoleLogins);
        findings.push(...inactiveConsoleLogins);
      }
    } catch (inactiveConsoleLoginError) {
      console.error('Error checking for IAM users with console logins inactive over 90 days:', inactiveConsoleLoginError);
    }

    // Check if IAM account password policy exists
    try {
      const passwordPolicyFinding = await checkPasswordPolicyExists(iamClient, accountId);
      if (passwordPolicyFinding) {
        passwordPolicyFindings.push(passwordPolicyFinding);
        findings.push(passwordPolicyFinding);
      } else {
        // If password policy exists, check if minimum length is less than 8
        const minLengthFinding = await checkPasswordPolicyMinLength(iamClient, accountId);
        if (minLengthFinding) {
          passwordPolicyFindings.push(minLengthFinding);
          findings.push(minLengthFinding);
        }

        // Check if max age is greater than 90 days
        const maxAgeFinding = await checkPasswordPolicyMaxAge(iamClient, accountId);
        if (maxAgeFinding) {
          passwordPolicyFindings.push(maxAgeFinding);
          findings.push(maxAgeFinding);
        }

        // Check if re-use prevention is less than 5
        const reusePreventionFinding = await checkPasswordPolicyReusePrevention(iamClient, accountId);
        if (reusePreventionFinding) {
          passwordPolicyFindings.push(reusePreventionFinding);
          findings.push(reusePreventionFinding);
        }

        // Check if lowercase letters are required
        const lowercaseFinding = await checkPasswordPolicyRequireLowercase(iamClient, accountId);
        if (lowercaseFinding) {
          passwordPolicyFindings.push(lowercaseFinding);
          findings.push(lowercaseFinding);
        }

        // Check if uppercase letters are required
        const uppercaseFinding = await checkPasswordPolicyRequireUppercase(iamClient, accountId);
        if (uppercaseFinding) {
          passwordPolicyFindings.push(uppercaseFinding);
          findings.push(uppercaseFinding);
        }

        // Check if numbers are required
        const numbersFinding = await checkPasswordPolicyRequireNumbers(iamClient, accountId);
        if (numbersFinding) {
          passwordPolicyFindings.push(numbersFinding);
          findings.push(numbersFinding);
        }

        // Check if symbols are required
        const symbolsFinding = await checkPasswordPolicyRequireSymbols(iamClient, accountId);
        if (symbolsFinding) {
          passwordPolicyFindings.push(symbolsFinding);
          findings.push(symbolsFinding);
        }

        // Check if passwords are required to expire
        const expirationFinding = await checkPasswordPolicyRequireExpiration(iamClient, accountId);
        if (expirationFinding) {
          passwordPolicyFindings.push(expirationFinding);
          findings.push(expirationFinding);
        }
      }
    } catch (policyError) {
      console.error('Error checking IAM account password policy:', policyError);
    }

    // Check for IAM roles with cross-account access
    try {
      const crossAccountRolesFindings = await checkIAMRolesWithCrossAccountAccess(iamClient, accountId);
      if (crossAccountRolesFindings.length > 0) {
        crossAccountRoleFindings.push(...crossAccountRolesFindings);
        findings.push(...crossAccountRolesFindings);
      }
    } catch (crossAccountError) {
      console.error('Error checking for IAM roles with cross-account access:', crossAccountError);
    }

    console.log(`Found ${notRotatedFindings.length} IAM users with old access keys, ${inactiveFindings.length} IAM users with inactive access keys over 90 days, ${oldPasswordFindings.length} IAM users with passwords older than 90 days, ${mfaDisabledFindings.length} IAM users with console access but without MFA enabled, ${inactiveConsoleLoginFindings.length} IAM users with console logins inactive over 90 days, ${rootUserAccessKeyUsedFindings.length} instances of root user access key usage within the last 90 days, ${rootUserMFADisabledFindings.length} instances of root user without MFA enabled, ${rootUserHasAccessKeysFindings.length} instances of root user with access keys, ${rootUserLoggedInFindings.length} instances of root user logged in within the last 90 days, ${passwordPolicyFindings.length} instances of IAM account password policy issues (missing, minimum length less than 8, max age greater than 90 days, or re-use prevention less than 5), and ${crossAccountRoleFindings.length} IAM roles with cross-account access`);
    return findings;
  } catch (error) {
    console.error('Error finding IAM users with old or inactive access keys, old passwords, without MFA, console logins inactive over 90 days, root user access key usage, root user without MFA, root user with access keys, root user logged in within the last 90 days, checking password policy issues (missing, minimum length less than 8, max age greater than 90 days, or re-use prevention less than 5), or checking for IAM roles with cross-account access:', error);
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
 * Check if an IAM account password policy exists
 * @param iamClient - IAM client
 * @returns A finding object if the password policy doesn't exist, null otherwise
 */
async function checkPasswordPolicyExists(iamClient: IAMClient, accountId: string | null = null): Promise<any | null> {
  try {
    // Try to get the account password policy
    const command = new GetAccountPasswordPolicyCommand({});
    await iamClient.send(command);

    // If we get here, the password policy exists
    return null;
  } catch (error: any) {
    // If the error is NoSuchEntity, it means the password policy doesn't exist
    if (error.name === 'NoSuchEntityException') {
      return {
        id: 'aws_iam_account_password_policy_does_not_exist',
        key: `aws-iam-account-password-policy-does-not-exist-${accountId}`,
        title: 'IAM Account Password Policy Does Not Exist',
        description: 'The AWS account does not have an IAM password policy configured. This is a critical security risk as it allows users to set weak passwords, increasing the risk of unauthorized access.',
        additionalInfo: {
          accountId: accountId
        }
      };
    }

    // For other errors, log and rethrow
    console.error('Error checking password policy:', error);
    throw error;
  }
}

/**
 * Check if the IAM account password policy minimum length is less than 8 characters
 * @param iamClient - IAM client
 * @param accountId - AWS account ID
 * @returns A finding object if the password policy minimum length is less than 8, null otherwise
 */
async function checkPasswordPolicyMinLength(iamClient: IAMClient, accountId: string | null = null): Promise<any | null> {
  try {
    // Try to get the account password policy
    const command = new GetAccountPasswordPolicyCommand({});
    const response: GetAccountPasswordPolicyCommandOutput = await iamClient.send(command);

    // Check if the minimum password length is less than 8
    if (response.PasswordPolicy && response.PasswordPolicy.MinimumPasswordLength && response.PasswordPolicy.MinimumPasswordLength < 8) {
      return {
        id: 'aws_iam_account_password_policy_min_length_less_than_8',
        key: `aws-iam-account-password-policy-min-length-less-than-8-${accountId}`,
        title: 'IAM Account Password Policy Minimum Length is less than 8',
        description: 'The AWS account\'s IAM password policy has a minimum length requirement that is less than 8 characters, which increases the risk of password-based attacks.',
        additionalInfo: {
          currentMinLength: response.PasswordPolicy.MinimumPasswordLength,
          accountId: accountId
        }
      };
    }

    // If we get here, the password policy minimum length is 8 or greater
    return null;
  } catch (error: any) {
    // If the error is NoSuchEntity, it means the password policy doesn't exist
    // This is already handled by checkPasswordPolicyExists, so we can just return null
    if (error.name === 'NoSuchEntityException') {
      return null;
    }

    // For other errors, log and rethrow
    console.error('Error checking password policy minimum length:', error);
    throw error;
  }
}

/**
 * Check if the IAM account password policy max age is greater than 90 days
 * @param iamClient - IAM client
 * @param accountId - AWS account ID
 * @returns A finding object if the password policy max age is greater than 90 days, null otherwise
 */
async function checkPasswordPolicyMaxAge(iamClient: IAMClient, accountId: string | null = null): Promise<any | null> {
  try {
    // Try to get the account password policy
    const command = new GetAccountPasswordPolicyCommand({});
    const response: GetAccountPasswordPolicyCommandOutput = await iamClient.send(command);

    // Check if the max password age is greater than 90 days or if password expiration is not required
    if (response.PasswordPolicy) {
      // If password expiration is not required, return a finding
      if (!response.PasswordPolicy.ExpirePasswords) {
        return {
          id: 'aws_iam_account_password_policy_max_age_greater_than_90_days',
          key: `aws-iam-account-password-policy-max-age-greater-than-90-days-${accountId}`,
          title: 'IAM Account Password Policy Max Age is greater than 90 days',
          description: 'The AWS account\'s IAM password policy does not require passwords to expire, which increases the risk of unauthorized access if passwords are compromised.',
          additionalInfo: {
            passwordExpirationRequired: false,
            accountId: accountId
          }
        };
      }

      // If max password age is greater than 90 days, return a finding
      if (response.PasswordPolicy.MaxPasswordAge && response.PasswordPolicy.MaxPasswordAge > 90) {
        return {
          id: 'aws_iam_account_password_policy_max_age_greater_than_90_days',
          key: `aws-iam-account-password-policy-max-age-greater-than-90-days-${accountId}`,
          title: 'IAM Account Password Policy Max Age is greater than 90 days',
          description: 'The AWS account\'s IAM password policy allows passwords to be used for more than 90 days, which increases the risk of unauthorized access if passwords are compromised.',
          additionalInfo: {
            currentMaxAge: response.PasswordPolicy.MaxPasswordAge,
            passwordExpirationRequired: true,
            accountId: accountId
          }
        };
      }
    }

    // If we get here, the password policy max age is 90 days or less
    return null;
  } catch (error: any) {
    // If the error is NoSuchEntity, it means the password policy doesn't exist
    // This is already handled by checkPasswordPolicyExists, so we can just return null
    if (error.name === 'NoSuchEntityException') {
      return null;
    }

    // For other errors, log and rethrow
    console.error('Error checking password policy max age:', error);
    throw error;
  }
}

/**
 * Check if the IAM account password policy re-use prevention is less than 5
 * @param iamClient - IAM client
 * @param accountId - AWS account ID
 * @returns A finding object if the password policy re-use prevention is less than 5, null otherwise
 */
async function checkPasswordPolicyReusePrevention(iamClient: IAMClient, accountId: string | null = null): Promise<any | null> {
  try {
    // Try to get the account password policy
    const command = new GetAccountPasswordPolicyCommand({});
    const response: GetAccountPasswordPolicyCommandOutput = await iamClient.send(command);

    // Check if password reuse prevention is less than 5 or not enabled
    if (response.PasswordPolicy) {
      // If password reuse prevention is not enabled, return a finding
      if (!response.PasswordPolicy.PasswordReusePrevention) {
        return {
          id: 'aws_iam_account_password_policy_reuse_prevention_less_than_5',
          key: `aws-iam-account-password-policy-reuse-prevention-less-than-5-${accountId}`,
          title: 'IAM Account Password Policy Re-use Prevention is less than 5',
          description: 'The AWS account\'s IAM password policy does not prevent password reuse, which increases the risk of password-based attacks.',
          additionalInfo: {
            passwordReusePreventionEnabled: false,
            accountId: accountId
          }
        };
      }

      // If password reuse prevention is less than 5, return a finding
      if (response.PasswordPolicy.PasswordReusePrevention < 5) {
        return {
          id: 'aws_iam_account_password_policy_reuse_prevention_less_than_5',
          key: `aws-iam-account-password-policy-reuse-prevention-less-than-5-${accountId}`,
          title: 'IAM Account Password Policy Re-use Prevention is less than 5',
          description: 'The AWS account\'s IAM password policy allows password reuse with less than 5 previous passwords remembered, which increases the risk of password-based attacks.',
          additionalInfo: {
            currentReusePreventionValue: response.PasswordPolicy.PasswordReusePrevention,
            passwordReusePreventionEnabled: true,
            accountId: accountId
          }
        };
      }
    }

    // If we get here, the password policy re-use prevention is 5 or greater
    return null;
  } catch (error: any) {
    // If the error is NoSuchEntity, it means the password policy doesn't exist
    // This is already handled by checkPasswordPolicyExists, so we can just return null
    if (error.name === 'NoSuchEntityException') {
      return null;
    }

    // For other errors, log and rethrow
    console.error('Error checking password policy re-use prevention:', error);
    throw error;
  }
}

/**
 * Check if the IAM account password policy requires lowercase letters
 * @param iamClient - IAM client
 * @param accountId - AWS account ID
 * @returns A finding object if the password policy doesn't require lowercase letters, null otherwise
 */
async function checkPasswordPolicyRequireLowercase(iamClient: IAMClient, accountId: string | null = null): Promise<any | null> {
  try {
    // Try to get the account password policy
    const command = new GetAccountPasswordPolicyCommand({});
    const response: GetAccountPasswordPolicyCommandOutput = await iamClient.send(command);

    // Check if password policy requires lowercase letters
    if (response.PasswordPolicy && !response.PasswordPolicy.RequireLowercaseCharacters) {
      return {
        id: 'aws_iam_account_password_policy_doesnt_require_lowercase',
        key: `aws-iam-account-password-policy-doesnt-require-lowercase-${accountId}`,
        title: 'IAM Account Password Policy Doesn\'t Require Lowercase Letters',
        description: 'The AWS account\'s IAM password policy does not require lowercase letters, which reduces password complexity and increases the risk of password-based attacks.',
        additionalInfo: {
          requireLowercaseCharacters: false,
          accountId: accountId
        }
      };
    }

    // If we get here, the password policy requires lowercase letters
    return null;
  } catch (error: any) {
    // If the error is NoSuchEntity, it means the password policy doesn't exist
    // This is already handled by checkPasswordPolicyExists, so we can just return null
    if (error.name === 'NoSuchEntityException') {
      return null;
    }

    // For other errors, log and rethrow
    console.error('Error checking password policy lowercase requirement:', error);
    throw error;
  }
}

/**
 * Check if the IAM account password policy requires uppercase letters
 * @param iamClient - IAM client
 * @param accountId - AWS account ID
 * @returns A finding object if the password policy doesn't require uppercase letters, null otherwise
 */
async function checkPasswordPolicyRequireUppercase(iamClient: IAMClient, accountId: string | null = null): Promise<any | null> {
  try {
    // Try to get the account password policy
    const command = new GetAccountPasswordPolicyCommand({});
    const response: GetAccountPasswordPolicyCommandOutput = await iamClient.send(command);

    // Check if password policy requires uppercase letters
    if (response.PasswordPolicy && !response.PasswordPolicy.RequireUppercaseCharacters) {
      return {
        id: 'aws_iam_account_password_policy_doesnt_require_uppercase',
        key: `aws-iam-account-password-policy-doesnt-require-uppercase-${accountId}`,
        title: 'IAM Account Password Policy Doesn\'t Require Uppercase Letters',
        description: 'The AWS account\'s IAM password policy does not require uppercase letters, which reduces password complexity and increases the risk of password-based attacks.',
        additionalInfo: {
          requireUppercaseCharacters: false,
          accountId: accountId
        }
      };
    }

    // If we get here, the password policy requires uppercase letters
    return null;
  } catch (error: any) {
    // If the error is NoSuchEntity, it means the password policy doesn't exist
    // This is already handled by checkPasswordPolicyExists, so we can just return null
    if (error.name === 'NoSuchEntityException') {
      return null;
    }

    // For other errors, log and rethrow
    console.error('Error checking password policy uppercase requirement:', error);
    throw error;
  }
}

/**
 * Check if the IAM account password policy requires numbers
 * @param iamClient - IAM client
 * @param accountId - AWS account ID
 * @returns A finding object if the password policy doesn't require numbers, null otherwise
 */
async function checkPasswordPolicyRequireNumbers(iamClient: IAMClient, accountId: string | null = null): Promise<any | null> {
  try {
    // Try to get the account password policy
    const command = new GetAccountPasswordPolicyCommand({});
    const response: GetAccountPasswordPolicyCommandOutput = await iamClient.send(command);

    // Check if password policy requires numbers
    if (response.PasswordPolicy && !response.PasswordPolicy.RequireNumbers) {
      return {
        id: 'aws_iam_account_password_policy_doesnt_require_numbers',
        key: `aws-iam-account-password-policy-doesnt-require-numbers-${accountId}`,
        title: 'IAM Account Password Policy Doesn\'t Require Numbers',
        description: 'The AWS account\'s IAM password policy does not require numbers, which reduces password complexity and increases the risk of password-based attacks.',
        additionalInfo: {
          requireNumbers: false,
          accountId: accountId
        }
      };
    }

    // If we get here, the password policy requires numbers
    return null;
  } catch (error: any) {
    // If the error is NoSuchEntity, it means the password policy doesn't exist
    // This is already handled by checkPasswordPolicyExists, so we can just return null
    if (error.name === 'NoSuchEntityException') {
      return null;
    }

    // For other errors, log and rethrow
    console.error('Error checking password policy numbers requirement:', error);
    throw error;
  }
}

/**
 * Check if the IAM account password policy requires symbols
 * @param iamClient - IAM client
 * @param accountId - AWS account ID
 * @returns A finding object if the password policy doesn't require symbols, null otherwise
 */
async function checkPasswordPolicyRequireSymbols(iamClient: IAMClient, accountId: string | null = null): Promise<any | null> {
  try {
    // Try to get the account password policy
    const command = new GetAccountPasswordPolicyCommand({});
    const response: GetAccountPasswordPolicyCommandOutput = await iamClient.send(command);

    // Check if password policy requires symbols
    if (response.PasswordPolicy && !response.PasswordPolicy.RequireSymbols) {
      return {
        id: 'aws_iam_account_password_policy_doesnt_require_symbols',
        key: `aws-iam-account-password-policy-doesnt-require-symbols-${accountId}`,
        title: 'IAM Account Password Policy Doesn\'t Require Symbols',
        description: 'The AWS account\'s IAM password policy does not require symbols, which reduces password complexity and increases the risk of password-based attacks.',
        additionalInfo: {
          requireSymbols: false,
          accountId: accountId
        }
      };
    }

    // If we get here, the password policy requires symbols
    return null;
  } catch (error: any) {
    // If the error is NoSuchEntity, it means the password policy doesn't exist
    // This is already handled by checkPasswordPolicyExists, so we can just return null
    if (error.name === 'NoSuchEntityException') {
      return null;
    }

    // For other errors, log and rethrow
    console.error('Error checking password policy symbols requirement:', error);
    throw error;
  }
}

/**
 * Check if the IAM account password policy requires passwords to expire
 * @param iamClient - IAM client
 * @param accountId - AWS account ID
 * @returns A finding object if the password policy doesn't require passwords to expire, null otherwise
 */
async function checkPasswordPolicyRequireExpiration(iamClient: IAMClient, accountId: string | null = null): Promise<any | null> {
  try {
    // Try to get the account password policy
    const command = new GetAccountPasswordPolicyCommand({});
    const response: GetAccountPasswordPolicyCommandOutput = await iamClient.send(command);

    // Check if the password policy requires passwords to expire
    if (response.PasswordPolicy && !response.PasswordPolicy.ExpirePasswords) {
      return {
        id: 'aws_iam_account_password_policy_doesnt_require_passwords_to_expire',
        key: `aws-iam-account-password-policy-doesnt-require-passwords-to-expire-${accountId}`,
        title: 'IAM Account Password Policy Doesn\'t Require Passwords to Expire',
        description: 'The AWS account\'s IAM password policy does not require passwords to expire, which increases the risk of unauthorized access if passwords are compromised.',
        additionalInfo: {
          passwordExpirationRequired: false,
          accountId: accountId
        }
      };
    }

    // If we get here, the password policy requires passwords to expire
    return null;
  } catch (error: any) {
    // If the error is NoSuchEntity, it means the password policy doesn't exist
    // This is already handled by checkPasswordPolicyExists, so we can just return null
    if (error.name === 'NoSuchEntityException') {
      return null;
    }

    // For other errors, log and rethrow
    console.error('Error checking password policy require expiration:', error);
    throw error;
  }
}

/**
 * Check if the root user has MFA enabled
 * @param iamClient - IAM client
 * @param accountId - AWS account ID
 * @returns A finding object if the root user does not have MFA enabled, null otherwise
 */
async function checkRootUserMFADisabled(iamClient: IAMClient, accountId: string | null = null): Promise<any | null> {
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
    const userNameIndex = headers.indexOf('user');
    const mfaActiveIndex = headers.indexOf('mfa_active');

    if (userNameIndex === -1 || mfaActiveIndex === -1) {
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
    const mfaActive = rootUserColumns[mfaActiveIndex].toLowerCase();

    // Check if MFA is not active for the root user
    if (mfaActive === 'false') {
      return {
        id: 'aws_root_user_mfa_disabled',
        key: `aws-root-user-mfa-disabled-${accountId}`,
        title: 'AWS Root User MFA Disabled',
        description: 'The AWS root user does not have MFA enabled, which is a critical security risk as it increases the vulnerability to unauthorized access to the AWS account.',
        additionalInfo: {
          mfaActive: false,
          ...(accountId && { accountId })
        }
      };
    }

    return null;
  } catch (error) {
    console.error('Error checking root user MFA status:', error);
    throw error;
  }
}

/**
 * Check if the root user has access keys
 * @param iamClient - IAM client
 * @param accountId - AWS account ID
 * @returns A finding object if the root user has access keys, null otherwise
 */
async function checkRootUserHasAccessKeys(iamClient: IAMClient, accountId: string | null = null): Promise<any | null> {
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
    const userNameIndex = headers.indexOf('user');
    const accessKey1ActiveIndex = headers.indexOf('access_key_1_active');
    const accessKey2ActiveIndex = headers.indexOf('access_key_2_active');

    if (userNameIndex === -1 || accessKey1ActiveIndex === -1 || accessKey2ActiveIndex === -1) {
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
    const accessKey1Active = rootUserColumns[accessKey1ActiveIndex].toLowerCase();
    const accessKey2Active = rootUserColumns[accessKey2ActiveIndex].toLowerCase();

    // Check if either access key is active for the root user
    if (accessKey1Active === 'true' || accessKey2Active === 'true') {
      return {
        id: 'aws_root_user_has_access_keys',
        key: `aws-root-user-has-access-keys-${accountId}`,
        title: 'AWS Root User has Access Keys',
        description: 'The AWS root user has access keys, which is a critical security risk as these keys provide programmatic access with full permissions and should not be used for day-to-day operations.',
        additionalInfo: {
          accessKey1Active: accessKey1Active === 'true',
          accessKey2Active: accessKey2Active === 'true',
          ...(accountId && { accountId })
        }
      };
    }

    return null;
  } catch (error) {
    console.error('Error checking if root user has access keys:', error);
    throw error;
  }
}

/**
 * Check if the root user has logged in within the last 90 days
 * @param iamClient - IAM client
 * @param ninetyDaysAgo - Date object representing 90 days ago
 * @param accountId - AWS account ID
 * @returns A finding object if the root user has logged in within the last 90 days, null otherwise
 */
async function checkRootUserLoggedInWithin90Days(iamClient: IAMClient, ninetyDaysAgo: Date, accountId: string | null = null): Promise<any | null> {
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
    const userNameIndex = headers.indexOf('user');
    const passwordLastUsedIndex = headers.indexOf('password_last_used');
    const consoleLastUsedIndex = headers.indexOf('console_last_used');

    if (userNameIndex === -1 || (passwordLastUsedIndex === -1 && consoleLastUsedIndex === -1)) {
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

    // Check if the root user has logged in within the last 90 days
    // First check password_last_used, then fall back to console_last_used if available
    let lastLoginDate = null;
    let loginType = null;

    if (passwordLastUsedIndex !== -1) {
      const passwordLastUsed = rootUserColumns[passwordLastUsedIndex];
      if (passwordLastUsed && passwordLastUsed !== 'N/A' && passwordLastUsed !== 'no_information' && passwordLastUsed !== 'not_supported') {
        lastLoginDate = new Date(passwordLastUsed);
        loginType = 'password';
      }
    }

    // If we didn't find a valid password_last_used date, check console_last_used
    if (!lastLoginDate && consoleLastUsedIndex !== -1) {
      const consoleLastUsed = rootUserColumns[consoleLastUsedIndex];
      if (consoleLastUsed && consoleLastUsed !== 'N/A' && consoleLastUsed !== 'no_information' && consoleLastUsed !== 'not_supported') {
        lastLoginDate = new Date(consoleLastUsed);
        loginType = 'console';
      }
    }

    // If we found a valid login date and it's within the last 90 days, create a finding
    if (lastLoginDate && lastLoginDate > ninetyDaysAgo) {
      const daysAgo = Math.floor((new Date().getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: 'aws_root_user_logged_in_90_days',
        key: `aws-root-user-logged-in-90-days-${accountId}`,
        title: 'AWS Root User Logged in within Last 90 Days',
        description: `The AWS root user account has been logged in within the last 90 days, which is a security risk as the root user should only be used for account and service management tasks that absolutely require root user access.`,
        additionalInfo: {
          loginType: loginType,
          lastLoginDate: lastLoginDate.toISOString(),
          daysAgo: daysAgo,
          ...(accountId && { accountId })
        }
      };
    }

    return null;
  } catch (error) {
    console.error('Error checking if root user has logged in within the last 90 days:', error);
    throw error;
  }
}

/**
 * Check for IAM users with console logins inactive over 90 days
 * @param iamClient - IAM client
 * @param ninetyDaysAgo - Date object representing 90 days ago
 * @param accountId - AWS account ID
 * @returns Array of findings for IAM users with console logins inactive over 90 days
 */
async function checkIAMUserConsoleLoginInactive(iamClient: IAMClient, ninetyDaysAgo: Date, accountId: string | null = null): Promise<any[]> {
  try {
    // Get the credential report
    const reportCsv = await getCredentialReport(iamClient);
    const findings: any[] = [];

    // Parse the CSV report
    const lines = reportCsv.split('\n');
    if (lines.length < 2) {
      console.log('Credential report is empty or malformed');
      return findings;
    }

    // Get the header line and find the indices of the relevant columns
    const headers = lines[0].split(',');
    const userNameIndex = headers.indexOf('user');
    const passwordEnabledIndex = headers.indexOf('password_enabled');
    const passwordLastUsedIndex = headers.indexOf('password_last_used');

    if (userNameIndex === -1 || passwordEnabledIndex === -1 || passwordLastUsedIndex === -1) {
      console.log('Credential report is missing required columns');
      return findings;
    }

    // Check each user in the credential report
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue; // Skip empty lines

      const columns = line.split(',');
      const userName = columns[userNameIndex];

      // Skip the root user
      if (userName === '<root_account>') continue;

      const passwordEnabled = columns[passwordEnabledIndex].toLowerCase() === 'true';
      const passwordLastUsed = columns[passwordLastUsedIndex];

      // Check if the user has console access (password enabled) but hasn't logged in for over 90 days
      if (passwordEnabled) {
        let isInactive = false;
        let lastLoginDate = null;
        let daysInactive = 0;

        if (passwordLastUsed === 'no_information' || passwordLastUsed === 'N/A' || passwordLastUsed === 'not_supported') {
          // If there's no login information, consider it inactive
          isInactive = true;
          daysInactive = 999; // Use a high number to indicate never used
        } else {
          lastLoginDate = new Date(passwordLastUsed);
          isInactive = lastLoginDate < ninetyDaysAgo;
          if (isInactive) {
            daysInactive = Math.floor((new Date().getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));
          }
        }

        if (isInactive) {
          const finding = {
            id: 'aws_iam_user_console_login_inactive_90_days',
            key: `aws-iam-user-console-login-inactive-90-days-${userName}`,
            title: `IAM User (${userName}) with Inactive Console Login`,
            description: `IAM user (${userName}) has console access but has not logged in for over 90 days, indicating a potentially unused account that should be disabled or removed.`,
            additionalInfo: {
              userName: userName,
              lastLoginDate: lastLoginDate ? lastLoginDate.toISOString() : 'Never',
              daysInactive: daysInactive,
              ...(accountId && { accountId })
            }
          };
          findings.push(finding);
        }
      }
    }

    return findings;
  } catch (error) {
    console.error('Error checking for IAM users with console logins inactive over 90 days:', error);
    return [];
  }
}

/**
 * Check for IAM roles with cross-account access
 * @param iamClient - IAM client
 * @param accountId - AWS account ID
 * @returns Array of findings for IAM roles with cross-account access
 */
async function checkIAMRolesWithCrossAccountAccess(iamClient: IAMClient, accountId: string | null = null): Promise<any[]> {
  try {
    console.log('Checking for IAM roles with cross-account access');
    const findings: any[] = [];

    // Get all IAM roles
    const roles = await getAllIAMRoles(iamClient);
    console.log(`Found ${roles.length} IAM roles`);

    // Check each role for cross-account access
    for (const role of roles) {
      // Skip if RoleName is undefined
      if (!role.RoleName) continue;

      // Get detailed role information including trust policy
      const roleDetails = await getRoleDetails(iamClient, role.RoleName);

      // Skip if AssumeRolePolicyDocument is undefined
      if (!roleDetails?.AssumeRolePolicyDocument) continue;

      // Parse the trust policy
      let trustPolicy;
      try {
        // The AssumeRolePolicyDocument is URL-encoded JSON
        const decodedPolicy = decodeURIComponent(roleDetails.AssumeRolePolicyDocument);
        trustPolicy = JSON.parse(decodedPolicy);
      } catch (error) {
        console.error(`Error parsing trust policy for role ${role.RoleName}:`, error);
        continue;
      }

      // Check if the trust policy allows cross-account access
      const crossAccountAccess = checkTrustPolicyForCrossAccountAccess(trustPolicy, accountId);

      if (crossAccountAccess.hasCrossAccountAccess) {
        const finding = {
          id: 'aws_iam_role_cross_account_access',
          key: `aws-iam-role-cross-account-access-${role.Arn}`,
          title: `IAM Role (${role.RoleName}) with Cross-Account Access`,
          description: `IAM role ${role.RoleName} (${role.Arn}) allows cross-account access from AWS account(s) ${crossAccountAccess.trustedAccounts.join(', ')}. While this may be intentional, it increases the risk surface and should be reviewed to ensure it's necessary and secure.`,
          additionalInfo: {
            roleName: role.RoleName,
            roleArn: role.Arn,
            trustedAccounts: crossAccountAccess.trustedAccounts,
            ...(accountId && { accountId })
          }
        };

        findings.push(finding);
      }
    }

    return findings;
  } catch (error) {
    console.error('Error checking for IAM roles with cross-account access:', error);
    return [];
  }
}

/**
 * Get all IAM roles
 * @param iamClient - IAM client
 * @returns Array of IAM roles
 */
async function getAllIAMRoles(iamClient: IAMClient) {
  try {
    const roles = [];
    let marker;

    do {
      const command: ListRolesCommand = new ListRolesCommand({ Marker: marker });
      const response: ListRolesCommandOutput = await iamClient.send(command);

      if (response.Roles) {
        roles.push(...response.Roles);
      }

      marker = response.Marker;
    } while (marker);

    return roles;
  } catch (error) {
    console.error('Error getting IAM roles:', error);
    return [];
  }
}

/**
 * Get detailed information for an IAM role
 * @param iamClient - IAM client
 * @param roleName - IAM role name
 * @returns Role details including trust policy
 */
async function getRoleDetails(iamClient: IAMClient, roleName: string) {
  try {
    const command: GetRoleCommand = new GetRoleCommand({ RoleName: roleName });
    const response: GetRoleCommandOutput = await iamClient.send(command);

    return response.Role;
  } catch (error) {
    console.error(`Error getting details for role ${roleName}:`, error);
    return null;
  }
}

/**
 * Check if a trust policy allows cross-account access
 * @param trustPolicy - The trust policy document
 * @param currentAccountId - The current AWS account ID
 * @returns Object indicating if cross-account access is allowed and which accounts are trusted
 */
function checkTrustPolicyForCrossAccountAccess(trustPolicy: any, currentAccountId: string | null = null): { hasCrossAccountAccess: boolean, trustedAccounts: string[] } {
  try {
    const trustedAccounts: string[] = [];
    let hasCrossAccountAccess = false;

    // Check if the policy has statements
    if (!trustPolicy.Statement) {
      return { hasCrossAccountAccess: false, trustedAccounts: [] };
    }

    // Ensure Statement is an array
    const statements = Array.isArray(trustPolicy.Statement) ? trustPolicy.Statement : [trustPolicy.Statement];

    // Check each statement for cross-account access
    for (const statement of statements) {
      // Skip if Effect is not "Allow"
      if (statement.Effect !== 'Allow') continue;

      // Check Principal for AWS accounts
      if (statement.Principal && statement.Principal.AWS) {
        const principals = Array.isArray(statement.Principal.AWS) ? statement.Principal.AWS : [statement.Principal.AWS];

        for (const principal of principals) {
          // Check if the principal is an AWS account ARN or ID
          if (typeof principal === 'string') {
            // Extract account ID from ARN or use the principal directly if it's an account ID
            let accountId = principal;

            // If it's an ARN, extract the account ID
            if (principal.startsWith('arn:aws:iam::')) {
              const match = principal.match(/arn:aws:iam::(\d+):/);
              if (match && match[1]) {
                accountId = match[1];
              }
            }

            // Check if this is a different account than the current one
            if (accountId !== currentAccountId && accountId !== '*' && !accountId.includes('root')) {
              hasCrossAccountAccess = true;
              if (!trustedAccounts.includes(accountId)) {
                trustedAccounts.push(accountId);
              }
            }

            // Special case: '*' means all AWS accounts, which is definitely cross-account access
            if (accountId === '*') {
              hasCrossAccountAccess = true;
              if (!trustedAccounts.includes('*')) {
                trustedAccounts.push('*');
              }
            }
          }
        }
      }
    }

    return { hasCrossAccountAccess, trustedAccounts };
  } catch (error) {
    console.error('Error checking trust policy for cross-account access:', error);
    return { hasCrossAccountAccess: false, trustedAccounts: [] };
  }
}

/**
 * Check if the root user has access keys that have been used within the last 90 days
 * @param iamClient - IAM client
 * @param ninetyDaysAgo - Date object representing 90 days ago
 * @returns A finding object if the root user has access keys that have been used within the last 90 days, null otherwise
 */
async function checkRootUserAccessKeyUsage(iamClient: IAMClient, ninetyDaysAgo: Date, accountId: string | null = null): Promise<any | null> {
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
          daysAgo: daysAgo,
          ...(accountId && { accountId })
        }
      };
    }

    return null;
  } catch (error) {
    console.error('Error checking root user access key usage:', error);
    throw error;
  }
}
