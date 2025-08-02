import { PrismaClient, App } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedPredefinedRoles, findOrCreateSuperAdminRole, assignSuperAdminRoleToUser } from './roles';

// Define interfaces for our data structures
interface ActionData {
  name: string;
  description: string;
}

interface AppFindingData {
  key: string;
  name: string;
  severity: string;
  description: string;
  type: string;
}

const prisma = new PrismaClient();

// Function to make the first user a super user if no super user exists
async function makeFirstUserSuperUser() {
  try {
    console.log("Checking if any super user exists...");

    // Check if any user is already marked as a super user
    const superUserCount = await prisma.user.count({
      where: {
        isSuperUser: true
      }
    });

    if (superUserCount > 0) {
      console.log(`Found ${superUserCount} super user(s). No need to make the first user a super user.`);
      return;
    }

    console.log("No super user found. Finding the first user...");

    // Find the first user by sorting by createdAt timestamp
    const firstUser = await prisma.user.findFirst({
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (!firstUser) {
      console.error("No users found in the database.");
      return;
    }

    console.log(`Found first user: ${firstUser.name || firstUser.email} (${firstUser.id})`);

    // Update the user to be a super user
    await prisma.user.update({
      where: { id: firstUser.id },
      data: { isSuperUser: true }
    });
    console.log("Updated the first user to be a super user.");

    // Assign the Super Administrator role to the first user
    await assignSuperAdminRoleToUser(firstUser.id);

    console.log("makeFirstUserSuperUser operation completed successfully.");
  } catch (error) {
    console.error("An error occurred in makeFirstUserSuperUser:", error);
  }
}

async function main() {
  // Seed predefined roles first
  await seedPredefinedRoles();

  // Check if any users exist
  const userCount = await prisma.user.count();

  // If no users exist, create a default admin user
  if (userCount === 0) {
    console.log('No users found. Creating default admin user...');

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin', 10);

    // Create the admin user
    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin',
        password: hashedPassword,
        isSuperUser: true,
      },
    });

    // Assign Super Administrator role to the admin user
    await assignSuperAdminRoleToUser(adminUser.id);

    console.log('Default admin user created successfully.');
  }

  // Make the first user a super user if no super user exists
  await makeFirstUserSuperUser();

  // Define apps with their configurations
  const appsData = [
    {
      type: 'saas',
      name: 'GitLab',
      description: 'Identify important security issues across your Gitlab organizations.',
      icon: 'gitlab',
      guide: 'gitlab-integration-guide.md',
      configFields: JSON.stringify([
        {
          name: 'gitlabUrl',
          label: 'GitLab URL',
          type: 'text',
          placeholder: 'https://gitlab.com',
          description: 'The URL of your GitLab instance'
        },
        {
          name: 'personalAccessToken',
          label: 'Personal Access Token',
          type: 'password',
          required: true,
          placeholder: 'glpat-xxxxxxxxxx',
          description: 'Your GitLab personal access token with API access'
        }
      ])
    },
    {
      type: 'saas',
      name: 'Jira',
      description: 'Integration with Jira issue tracking',
      icon: 'jira',
      guide: 'jira-integration-guide.md',
      configFields: JSON.stringify([
        {
          name: 'siteUrl',
          label: 'Jira Site URL',
          type: 'text',
          required: true,
          placeholder: 'https://your-domain.atlassian.net',
          description: 'The URL of your Jira instance'
        },
        {
          name: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: '',
          description: 'Your Jira API token or access token'
        }
      ])
    },
    {
      type: 'cloud',
      name: 'AWS',
      description: 'Identify security issues in your AWS environment.',
      icon: 'aws',
      guide: 'aws-integration-guide.md',
      configFields: JSON.stringify([
        {
          name: 'roleArn',
          label: 'IAM Role ARN',
          type: 'text',
          required: true,
          placeholder: 'arn:aws:iam::123456789012:role/OwlHub-Integration-Role',
          description: 'The ARN of the IAM role that grants OwlHub access to your AWS account. See the AWS Integration Guide for details on how to create this role.'
        },
        {
          name: 'externalId',
          label: 'External ID',
          type: 'text',
          required: true,
          placeholder: '',
          description: 'The External ID used to establish a secure trust relationship between your AWS account and OwlHub. This should match the External ID used when creating the IAM role.'
        },
        {
          name: 'orgMode',
          label: 'Organization Mode',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Enable to automatically discover and add all AWS accounts in your organization. The IAM Role ARN should be for the organization management account with permissions to list accounts.'
        }
      ])
    }
  ];

  // Get all existing apps
  const existingApps = await prisma.app.findMany();
  const existingAppNames = existingApps.map(app => app.name);

  // Track processed apps to identify which ones to delete later
  const processedAppIds: string[] = [];

  // Process each app
  const appMap: Record<string, App> = {};

  for (const appData of appsData) {
    let app;

    // Check if app already exists
    const existingApp = existingApps.find(a => a.name === appData.name);

    if (existingApp) {
      // Update existing app
      app = await prisma.app.update({
        where: { id: existingApp.id },
        data: appData
      });
      console.log(`Updated app: ${app.name}`);
    } else {
      // Create new app
      app = await prisma.app.create({
        data: appData
      });
      console.log(`Created app: ${app.name}`);
    }

    processedAppIds.push(app.id);
    appMap[app.name] = app;
  }

  // Delete apps that are no longer in the seeder
  const appsToDelete = existingApps.filter(app => !processedAppIds.includes(app.id));
  for (const app of appsToDelete) {
    await prisma.app.delete({
      where: { id: app.id }
    });
    console.log(`Deleted app: ${app.name}`);
  }

  // Define app findings data for each app
  const appFindingsData: Record<string, AppFindingData[]> = {
    'GitLab': [
      {
        "key": "gitlab_public_project",
        "name": "Public Repository",
        "severity": "high",
        "description": "The repository is publicly accessible, which may expose sensitive code or information.",
        "type": "posture"
      },
      {
        "key": "gitlab_unprotected_default_branch",
        "name": "Unprotected Default Branch",
        "severity": "high",
        "description": "The default branch is not protected, allowing direct pushes and force-pushes that can compromise code integrity.",
        "type": "posture"
      },
      {
        "key": "gitlab_repo_access_without_expiry",
        "name": "Repository Access without Expiry",
        "severity": "high",
        "description": "Users have access to repositories without an expiry date, posing a risk of unauthorized long-term access.",
        "type": "posture"
      },
      {
        "key": "gitlab_repo_owner_with_expiry",
        "name": "Repository Owner have expiry",
        "severity": "high",
        "description": "Repository Owner have an expiry date, posing a risk of loosing access to repo after expiry.",
        "type": "posture"
      },

      // {
      //   "key": "gitlab_external_user_with_maintainer_role",
      //   "name": "External User with Maintainer Role",
      //   "severity": "high",
      //   "description": "External users granted Maintainer or higher roles can modify or delete critical repository data."
      // },
      // {
      //   "key": "gitlab_user_without_2fa",
      //   "name": "User Without 2FA Enabled",
      //   "severity": "medium",
      //   "description": "Users accessing repositories without two-factor authentication increase the risk of unauthorized access."
      // },
      // {
      //   "key": "gitlab_pat_without_expiry",
      //   "name": "Personal Access Token Without Expiry",
      //   "severity": "high",
      //   "description": "Personal access tokens without expiration dates pose long-term security risks if compromised."
      // },
      // {
      //   "key": "gitlab_exposed_ci_variable",
      //   "name": "Exposed CI/CD Variable",
      //   "severity": "medium",
      //   "description": "CI/CD environment variables are exposed to all jobs, including those triggered by external contributors."
      // },
      // {
      //   "key": "gitlab_self_hosted_runner_on_public_repo",
      //   "name": "Self-hosted Runner on Public Repository",
      //   "severity": "critical",
      //   "description": "Public repositories using self-hosted runners may allow untrusted users to run malicious code on internal infrastructure."
      // },
      // {
      //   "key": "gitlab_hardcoded_secret",
      //   "name": "Hardcoded Secrets in Repository",
      //   "severity": "critical",
      //   "description": "Secrets like API keys or passwords are hardcoded in the repository, posing a major security risk."
      // },
      // {
      //   "key": "gitlab_shared_deploy_key",
      //   "name": "Shared Deploy Key Across Projects",
      //   "severity": "high",
      //   "description": "A single deploy key is reused across multiple projects, increasing blast radius if the key is compromised."
      // }
    ],
    'Jira': [
      // {
      //   key: 'issue_data_access',
      //   name: 'Issue Data Access',
      //   severity: 'medium',
      //   description: 'Access to all issue data and attachments'
      // },
      // {
      //   key: 'user_information',
      //   name: 'User Information',
      //   severity: 'low',
      //   description: 'Access to user profile information'
      // },
      // {
      //   key: 'project_configuration',
      //   name: 'Project Configuration',
      //   severity: 'high',
      //   description: 'Ability to view project configurations and settings'
      // }
    ],
    'AWS': [
      {
        "key": "aws_ecr_repository_tag_immutability_disabled",
        "name": "ECR Repository Does Not Have Image Tag Immutability Enabled",
        "severity": "high",
        "description": "Detects private Amazon ECR repositories where image tag immutability is disabled. When immutability is off, tags like 'latest' or versioned tags can be overwritten, making it difficult to trace what code is running. Enabling tag immutability prevents tampering and ensures auditability of container deployments.",
        "type": "posture"
      },
      {
        "key": "aws_ecr_repository_no_lifecycle_policy",
        "name": "ECR Repository Does Not Have a Lifecycle Policy Configured",
        "severity": "medium",
        "description": "Detects private Amazon ECR repositories that do not have a lifecycle policy configured. Without lifecycle rules, outdated and unused images may accumulate, leading to unnecessary storage costs and difficulty managing image versions. It is recommended to configure policies to expire untagged or old images regularly.",
        "type": "posture"
      },
      {
        "key": "aws_security_group_not_attached",
        "name": "Security Group Is Not Attached to Any Resource",
        "severity": "low",
        "description": "Detects security groups that are not associated with any active resource such as EC2 instances, ENIs, Load Balancers, RDS instances, or Lambda functions. Unused security groups create unnecessary clutter and may cause confusion or lead to accidental reuse of insecure rules. These should be reviewed and deleted if not needed.",
        "type": "posture"
      },
      {
        "key": "aws_vpc_subnet_auto_assign_public_ip",
        "name": "VPC Subnet Is Configured to Auto-Assign Public IPv4 Addresses",
        "severity": "high",
        "description": "Detects subnets where the auto-assign public IPv4 address setting is enabled. This setting causes EC2 instances launched into the subnet to receive a public IP by default, which may expose them to the internet unless security groups and route tables are tightly controlled. It is recommended to disable this setting for private subnets.",
        "type": "posture"
      },
      {
        "key": "aws_acm_certificate_expired",
        "name": "ACM Certificate Expired",
        "severity": "critical",
        "description": "ACM certificates that have expired.",
        "type": "posture"
      },
      {
        "key": "aws_acm_certificate_expires_within_30_days",
        "name": "ACM Certificate Expires within 30 days",
        "severity": "medium",
        "description": "ACM certificates that are expiring within 30 days.",
        "type": "posture"
      },
      {
        "key": "aws_acm_certificate_has_domain_wildcard",
        "name": "ACM Certificate has Domain Wildcard",
        "severity": "high",
        "description": "ACM certificates that have a domain wildcard.",
        "type": "posture"
      },
      {
        "key": "aws_iam_account_password_policy_does_not_exist",
        "name": "IAM Account Password Policy Does Not Exist",
        "severity": "critical",
        "description": "The AWS account does not have an IAM password policy configured. This is a critical security risk as it allows users to set weak passwords, increasing the risk of unauthorized access.",
        "type": "posture"
      },
      {
        "key": "aws_iam_account_password_policy_min_length_less_than_8",
        "name": "IAM Account Password Policy Minimum Length is less than 8",
        "severity": "high",
        "description": "The AWS account's IAM password policy has a minimum length requirement that is less than 8 characters, which increases the risk of password-based attacks.",
        "type": "posture"
      },
      {
        "key": "aws_iam_account_password_policy_max_age_greater_than_90_days",
        "name": "IAM Account Password Policy Max Age is greater than 90 days",
        "severity": "high",
        "description": "The AWS account's IAM password policy allows passwords to be used for more than 90 days, which increases the risk of unauthorized access if passwords are compromised.",
        "type": "posture"
      },
      {
        "key": "aws_iam_account_password_policy_reuse_prevention_less_than_5",
        "name": "IAM Account Password Policy Re-use Prevention is less than 5",
        "severity": "high",
        "description": "The AWS account's IAM password policy allows password reuse with less than 5 previous passwords remembered, which increases the risk of password-based attacks.",
        "type": "posture"
      },
      {
        "key": "aws_iam_account_password_policy_doesnt_require_lowercase",
        "name": "IAM Account Password Policy Doesn't Require Lowercase Letters",
        "severity": "high",
        "description": "The AWS account's IAM password policy does not require lowercase letters, which reduces password complexity and increases the risk of password-based attacks.",
        "type": "posture"
      },
      {
        "key": "aws_iam_account_password_policy_doesnt_require_uppercase",
        "name": "IAM Account Password Policy Doesn't Require Uppercase Letters",
        "severity": "high",
        "description": "The AWS account's IAM password policy does not require uppercase letters, which reduces password complexity and increases the risk of password-based attacks.",
        "type": "posture"
      },
      {
        "key": "aws_iam_account_password_policy_doesnt_require_numbers",
        "name": "IAM Account Password Policy Doesn't Require Numbers",
        "severity": "low",
        "description": "The AWS account's IAM password policy does not require numbers, which reduces password complexity and increases the risk of password-based attacks.",
        "type": "posture"
      },
      {
        "key": "aws_iam_account_password_policy_doesnt_require_symbols",
        "name": "IAM Account Password Policy Doesn't Require Symbols",
        "severity": "high",
        "description": "The AWS account's IAM password policy does not require symbols, which reduces password complexity and increases the risk of password-based attacks.",
        "type": "posture"
      },
      {
        "key": "aws_iam_account_password_policy_doesnt_require_passwords_to_expire",
        "name": "IAM Account Password Policy Doesn't Require Passwords to Expire",
        "severity": "high",
        "description": "The AWS account's IAM password policy does not require passwords to expire, which increases the risk of unauthorized access if passwords are compromised.",
        "type": "posture"
      },
      {
        "key": "aws_root_user_access_key_used_90_days",
        "name": "AWS Root User Access Key Used within Last 90 Days",
        "severity": "critical",
        "description": "AWS root user access keys have been used within the last 90 days, which is a security risk as the root user should only be used for account and service management tasks that require root user access.",
        "type": "posture"
      },
      {
        "key": "aws_root_user_mfa_disabled",
        "name": "AWS Root User MFA Disabled",
        "severity": "critical",
        "description": "The AWS root user does not have MFA enabled, which is a critical security risk as it increases the vulnerability to unauthorized access to the AWS account.",
        "type": "posture"
      },
      {
        "key": "aws_root_user_has_access_keys",
        "name": "AWS Root User has Access Keys",
        "severity": "critical",
        "description": "The AWS root user has access keys, which is a security risk as the root user should not have programmatic access. Root user access keys should be deleted and IAM users with appropriate permissions should be used instead.",
        "type": "posture"
      },
      {
        "key": "aws_root_user_logged_in_90_days",
        "name": "AWS Root User Logged in within Last 90 Days",
        "severity": "critical",
        "description": "The AWS root user account has been logged in within the last 90 days, which is a security risk as the root user should only be used for account and service management tasks that absolutely require root user access.",
        "type": "posture"
      },
      {
        "key": "aws_iam_access_key_inactive_90_days",
        "name": "IAM Access Key Inactive over 90 Days",
        "severity": "medium",
        "description": "IAM user access keys that have been inactive for over 90 days and should be removed to reduce the attack surface.",
        "type": "posture"
      },
      {
        "key": "aws_iam_access_key_not_rotated_90_days",
        "name": "IAM Access Key Not Rotated over 90 Days",
        "severity": "medium",
        "description": "IAM user access keys that have not been rotated in over 90 days, increasing the risk of unauthorized access.",
        "type": "posture"
      },
      {
        "key": "aws_iam_user_password_older_90_days",
        "name": "IAM User Password Older Than 90 Days",
        "severity": "medium",
        "description": "IAM users with passwords that have not been rotated in over 90 days, increasing the risk of unauthorized access.",
        "type": "posture"
      },
      {
        "key": "aws_iam_user_mfa_disabled",
        "name": "IAM User MFA Disabled",
        "severity": "medium",
        "description": "IAM users with console access that do not have MFA enabled, increasing the risk of unauthorized access if passwords are compromised.",
        "type": "posture"
      },
      {
        "key": "aws_iam_user_console_login_inactive_90_days",
        "name": "IAM User Console Login Inactive Over 90 Days",
        "severity": "medium",
        "description": "IAM users with console access that have not logged in for over 90 days, indicating potentially unused accounts that should be disabled or removed.",
        "type": "posture"
      },
      {
        "key": "aws_iam_role_cross_account_access",
        "name": "IAM Role with Cross-Account Access",
        "severity": "high",
        "description": "IAM roles that allow cross-account access, which increases the risk surface and should be reviewed to ensure it's necessary and secure.",
        "type": "posture"
      },
      {
        "key": "aws_s3_bucket_publicly_accessible",
        "name": "S3 Bucket Publicly Accessible",
        "severity": "critical",
        "description": "S3 bucket is configured to allow public access, which could lead to unauthorized access to sensitive data.",
        "type": "posture"
      },
      {
        "key": "aws_s3_bucket_versioning_disabled",
        "name": "S3 Bucket Versioning Disabled",
        "severity": "low",
        "description": "S3 bucket does not have versioning enabled, which increases the risk of accidental deletion or overwrite of objects.",
        "type": "posture"
      },
      {
        "key": "aws_s3_bucket_replication_disabled",
        "name": "S3 Bucket Without Replication Enabled",
        "severity": "medium",
        "description": "S3 bucket does not have replication enabled, which increases the risk of data loss in case of a regional outage or disaster.",
        "type": "posture"
      },
      {
        "key": "aws_s3_bucket_server_side_encryption_disabled",
        "name": "S3 Bucket Server Side Encryption Disabled",
        "severity": "medium",
        "description": "S3 bucket does not have server-side encryption enabled, which increases the risk of unauthorized access to sensitive data if the bucket is compromised.",
        "type": "posture"
      },
      {
        "key": "aws_s3_bucket_access_logging_disabled",
        "name": "S3 Bucket Access Logging Disabled",
        "severity": "low",
        "description": "S3 bucket does not have access logging enabled, which makes it difficult to track access to the bucket and investigate security incidents.",
        "type": "posture"
      },
      {
        "key": "aws_s3_bucket_lifecycle_disabled",
        "name": "S3 Bucket Lifecycle Disabled",
        "severity": "low",
        "description": "S3 bucket does not have lifecycle policies enabled, which can lead to increased storage costs and reduced performance over time.",
        "type": "posture"
      },
      {
        "key": "aws_s3_bucket_policy_not_existent",
        "name": "S3 Bucket Policy Not Existent",
        "severity": "low",
        "description": "S3 bucket does not have a bucket policy, which may leave the bucket vulnerable to unauthorized access or actions.",
        "type": "posture"
      },
      {
        "key": "aws_s3_bucket_object_level_logging_disabled",
        "name": "S3 Bucket Without Object-Level Logging",
        "severity": "medium",
        "description": "S3 bucket does not have object-level logging enabled, which makes it difficult to track and audit object-level operations on the bucket.",
        "type": "posture"
      },
      {
        "key": "aws_s3_bucket_encryption_in_transit_disabled",
        "name": "S3 Bucket Encryption in Transit Disabled",
        "severity": "medium",
        "description": "S3 bucket does not enforce encryption in transit (HTTPS), which could allow sensitive data to be intercepted during transmission.",
        "type": "posture"
      },
      {
        "key": "aws_s3_bucket_mfa_delete_disabled",
        "name": "S3 Bucket MFA Delete Disabled",
        "severity": "medium",
        "description": "S3 bucket does not have MFA Delete enabled, which increases the risk of accidental or malicious deletion of objects.",
        "type": "posture"
      },
      {
        "key": "aws_vpc_default_vpc_exists",
        "name": "Default VPC Exists in Region",
        "severity": "low",
        "description": "Default VPCs are automatically created and may be over-permissive. It's recommended to delete them if unused.",
        "type": "posture"
      },
      {
        "key": "aws_vpc_flow_logs_not_enabled",
        "name": "VPC Flow Logs Not Enabled",
        "severity": "medium",
        "description": "Detects VPCs without Flow Logs, reducing the ability to monitor and audit network activity.",
        "type": "posture"
      },
      {
        "key": "aws_vpc_igw_not_attached_to_vpc",
        "name": "Internet Gateway Not Attached to VPC",
        "severity": "low",
        "description": "Flags IGWs that are not connected to any vpc, indicating possible unused setup.",
        "type": "posture"
      },
      {
        "key": "aws_vpc_igw_not_properly_routed",
        "name": "Internet Gateway Not Properly Routed",
        "severity": "low",
        "description": "Flags IGWs that are not connected to any route table, indicating possible misconfiguration or unused setup.",
        "type": "posture"
      },
      {
        "key": "aws_vpc_unused_route_table",
        "name": "Unused Route Table Detected",
        "severity": "low",
        "description": "Detects route tables that are not associated with any subnet, which could be cleanup candidates.",
        "type": "posture"
      },
      {
        "key": "aws_vpc_empty_without_subnets",
        "name": "Empty VPC Without Subnets",
        "severity": "low",
        "description": "Flags VPCs that do not contain any subnets, which may indicate unused or abandoned resources.",
        "type": "posture"
      },
      {
        "key": "aws_vpc_blackhole_routes",
        "name": "Blackhole Routes in VPC",
        "severity": "medium",
        "description": "Detects route tables with blackhole routes, which may be caused by deleted or misconfigured targets.",
        "type": "posture"
      },
      {
        "key": "aws_vpc_no_eni_resources",
        "name": "VPC Does Not Contain Any ENI-Provisioning Resource",
        "severity": "low",
        "description": "Detects Virtual Private Clouds (VPCs) that do not host any active resource capable of provisioning an Elastic Network Interface (ENI). This includes EC2 instances, RDS, NAT Gateways, Load Balancers, Lambda functions (in VPC), and other services that generate ENIs. Empty VPCs may be stale, misconfigured, or safe to delete.",
        "type": "posture"
      },
      {
        "key": "aws_vpc_missing_gateway_endpoint",
        "name": "S3 or DynamoDB Traffic Not Routed Through Gateway Endpoint",
        "severity": "high",
        "description": "Detects traffic to Amazon S3 or DynamoDB that is not routed through a VPC Gateway Endpoint. Without endpoint routing, access defaults to public internet paths, potentially increasing security risks and incurring NAT Gateway data processing charges. Using Gateway Endpoints ensures secure, private access from within the VPC.",
        "type": "posture"
      },
      {
        "key": "aws_ec2_unattached_eni",
        "name": "Unattached Elastic Network Interface (ENI)",
        "severity": "low",
        "description": "Detects Elastic Network Interfaces (ENIs) that are not attached to any resource such as EC2 instances, Lambda functions, NAT Gateways, or Load Balancers. Unattached ENIs may indicate leftover infrastructure from terminated resources and should be reviewed for cleanup.",
        "type": "posture"
      },
      {
        "key": "aws_ec2_unattached_eip",
        "name": "Elastic IP Allocated but Not Attached to Any Resource",
        "severity": "low",
        "description": "Detects Elastic IPs (EIPs) that are allocated in your AWS account but not associated with any EC2 instance, NAT Gateway, or ENI. These unassociated EIPs incur hourly charges and can consume quota unnecessarily. They should be released or reassigned to avoid waste.",
        "type": "cost"
      },
      {
        "key": "aws_cloudfront_distribution_compression_disabled",
        "name": "CloudFront Distribution Does Not Have Compression Enabled",
        "severity": "medium",
        "description": "Detects CloudFront distributions where content compression (gzip or Brotli) is not enabled. Compression reduces data size over the network, improves performance for clients, and lowers data transfer costs. This setting should be enabled for all distributions that serve compressible content like HTML, CSS, or JavaScript.",
        "type": "posture"
      },
      {
        "key": "aws_ebs_gp2_volumes",
        "name": "EBS Volumes Using gp2 Instead of gp3",
        "severity": "medium",
        "description": "Detects Amazon EBS volumes still using the gp2 volume type. AWS recommends migrating to gp3 for better performance tuning and lower cost. gp3 offers higher baseline performance, separate IOPS/bandwidth configuration, and up to 20% cost savings compared to gp2.",
        "type": "posture"
      },
      {
        "key": "aws_rds_instance_without_ri",
        "name": "RDS Instance Running Without Matching Reserved Instance",
        "severity": "medium",
        "description": "Detects RDS instances that are consistently running on-demand without a corresponding Reserved Instance (RI) covering their instance type, region, and availability zone. Lack of RIs for predictable workloads leads to unnecessarily high hourly charges. Purchasing RIs for sustained usage can optimize cost efficiency.",
        "type": "cost"
      },
      {
        "key": "aws_rds_cluster_without_ri",
        "name": "RDS Cluster Running Without Matching Reserved Instance",
        "severity": "medium",
        "description": "Detects RDS clusters that are consistently running on-demand without a corresponding Reserved Instance (RI) covering their instance type, region, and availability zone. Lack of RIs for predictable workloads leads to unnecessarily high hourly charges. Purchasing RIs for sustained usage can optimize cost efficiency.",
        "type": "cost"
      },
      {
        "key": "aws_rds_instance_publicly_accessible",
        "name": "RDS Instance Is Publicly Accessible",
        "severity": "high",
        "description": "Detects Amazon RDS instances with the 'PubliclyAccessible' flag set to true. Publicly accessible databases are exposed to the internet, increasing the risk of unauthorized access, data breaches, and denial-of-service attacks. RDS instances should be deployed in private subnets and accessed through secure, internal mechanisms.",
        "type": "posture"
      },
      {
        "key": "aws_rds_credentials_not_in_secrets_manager",
        "name": "RDS Root or Master Credentials Not Managed by AWS Secrets Manager",
        "severity": "high",
        "description": "Detects RDS instances where the master (root) database credentials are not stored or rotated using AWS Secrets Manager. Managing credentials manually increases the risk of credential sprawl, unauthorized access, and audit non-compliance. Secrets Manager enables secure storage, access control, and automated rotation of RDS credentials.",
        "type": "posture"
      },
      {
        "key": "aws_rds_instance_without_deletion_protection",
        "name": "RDS Instance Does Not Have Deletion Protection Enabled",
        "severity": "high",
        "description": "Detects Amazon RDS instances that do not have deletion protection enabled. Without this safeguard, databases can be accidentally or maliciously deleted, leading to data loss, service downtime, and compliance violations. Deletion protection is especially critical for production environments.",
        "type": "posture"
      },
      {
        "key": "aws_rds_cluster_without_deletion_protection",
        "name": "RDS Cluster Does Not Have Deletion Protection Enabled",
        "severity": "high",
        "description": "Detects RDS clusters (including Amazon Aurora) that do not have deletion protection enabled. Without this setting, the entire cluster—including all DB instances and shared storage—can be accidentally or maliciously deleted. Deletion protection is essential for production and business-critical workloads to prevent data loss and downtime.",
        "type": "posture"
      },
      {
        "key": "aws_elb_idle",
        "name": "Elastic Load Balancer (ELB) Is Idle and Should Be Deleted",
        "severity": "medium",
        "description": "Detects Elastic Load Balancers (Classic, ALB, or NLB) that have no registered targets or have served zero or minimal traffic over a defined period (e.g., 7–30 days). Idle ELBs still incur hourly charges and may indicate abandoned infrastructure. These should be reviewed and deleted if no longer required.",
        "type": "cost"
      },
      {
        "key": "aws_route53_public_hosted_zone_not_resolvable",
        "name": "Route 53 Public Hosted Zone Is Not Resolvable via Public DNS",
        "severity": "high",
        "description": "Detects Route 53 public hosted zones that are not resolvable via public DNS resolvers such as 8.8.8.8 or 1.1.1.1. This may indicate missing or incorrect delegation, expired domain registration, or propagation delays. Public hosted zones should be properly configured to ensure DNS resolution works globally.",
        "type": "posture"
      },
      {
        "key": "aws_vpc_peering_dns_resolution_disabled",
        "name": "VPC Peering Connection Does Not Have DNS Resolution Enabled on Both Sides",
        "severity": "medium",
        "description": "Detects VPC peering connections where DNS resolution is not enabled for either the requester or acceptor VPC. Without this setting, private DNS names from one VPC cannot resolve to IP addresses in the peered VPC, which may break internal service discovery and name resolution for applications.",
        "type": "posture"
      },
      // {
      //   "key": "aws_unencrypted_ebs_volume",
      //   "name": "Unencrypted EBS Volume",
      //   "severity": "high",
      //   "description": "EBS volumes that are not encrypted, potentially exposing sensitive data if the volume is compromised."
      // }
    ]
  };

  // Define actions data for each app
  const actionsData: Record<string, ActionData[]> = {
    'GitLab': [
      // {
      //   name: 'Repository Scanning',
      //   description: 'Scan repositories for security vulnerabilities'
      // },
      // {
      //   name: 'Commit Monitoring',
      //   description: 'Monitor commits for sensitive information'
      // },
      // {
      //   name: 'Branch Protection',
      //   description: 'Enforce branch protection rules'
      // }
    ] as ActionData[],
    'Jira': [
      // {
      //   name: 'Issue Tracking',
      //   description: 'Track security issues and vulnerabilities'
      // },
      // {
      //   name: 'Workflow Automation',
      //   description: 'Automate security workflows'
      // },
      // {
      //   name: 'Risk Assessment',
      //   description: 'Assess and prioritize security risks'
      // }
    ] as ActionData[],
    'AWS': [
      // {
      //   name: 'Security Scanning',
      //   description: 'Scan AWS resources for security vulnerabilities and misconfigurations'
      // },
      // {
      //   name: 'Compliance Monitoring',
      //   description: 'Monitor AWS resources for compliance with security best practices and standards'
      // },
      // {
      //   name: 'Resource Inventory',
      //   description: 'Maintain an inventory of AWS resources across all regions'
      // },
      // {
      //   name: 'IAM Analysis',
      //   description: 'Analyze IAM roles, users, and policies for security risks'
      // }
    ] as ActionData[]
  };

  // Process app findings for each app
  for (const [appName, findings] of Object.entries(appFindingsData)) {
    const app = appMap[appName];
    if (!app) continue;

    // Get existing app findings for this app
    const existingFindings = await prisma.appFinding.findMany({
      where: { appId: app.id }
    });

    // Track processed findings to identify which ones to delete later
    const processedFindingIds: string[] = [];

    // Process each finding
    for (const findingData of findings) {
      // Add appId to the finding data
      const completeData = { ...findingData, appId: app.id };

      // Check if finding already exists (match by key and appId)
      const existingFinding = existingFindings.find(f => 
        (f as any).key === findingData.key && f.appId === app.id
      );

      if (existingFinding) {
        // Update existing finding
        const updatedFinding = await prisma.appFinding.update({
          where: { id: existingFinding.id },
          data: completeData
        });
        processedFindingIds.push(updatedFinding.id);
        console.log(`Updated app finding: ${updatedFinding.name} for ${appName}`);
      } else {
        // Create new finding
        const newFinding = await prisma.appFinding.create({
          data: completeData
        });
        processedFindingIds.push(newFinding.id);
        console.log(`Created app finding: ${newFinding.name} for ${appName}`);
      }
    }

    // Delete findings that are no longer in the seeder
    const findingsToDelete = existingFindings.filter(finding => 
      !processedFindingIds.includes(finding.id)
    );

    for (const finding of findingsToDelete) {
      await prisma.appFinding.delete({
        where: { id: finding.id }
      });
      console.log(`Deleted app finding: ${finding.name} for ${appName}`);
    }
  }

  // Process actions for each app
  for (const [appName, actions] of Object.entries(actionsData)) {
    const app = appMap[appName];
    if (!app) continue;

    // Get existing actions for this app
    const existingActions = await prisma.action.findMany({
      where: { appId: app.id }
    });

    // Track processed actions to identify which ones to delete later
    const processedActionIds: string[] = [];

    // Process each action
    for (const actionData of actions) {
      // Add appId to the action data
      const completeData = { ...actionData, appId: app.id };

      // Check if action already exists (match by name and appId)
      const existingAction = existingActions.find(a => 
        a.name === actionData.name && a.appId === app.id
      );

      if (existingAction) {
        // Update existing action
        const updatedAction = await prisma.action.update({
          where: { id: existingAction.id },
          data: completeData
        });
        processedActionIds.push(updatedAction.id);
        console.log(`Updated action: ${updatedAction.name} for ${appName}`);
      } else {
        // Create new action
        const newAction = await prisma.action.create({
          data: completeData
        });
        processedActionIds.push(newAction.id);
        console.log(`Created action: ${newAction.name} for ${appName}`);
      }
    }

    // Delete actions that are no longer in the seeder
    const actionsToDelete = existingActions.filter(action => 
      !processedActionIds.includes(action.id)
    );

    for (const action of actionsToDelete) {
      await prisma.action.delete({
        where: { id: action.id }
      });
      console.log(`Deleted action: ${action.name} for ${appName}`);
    }
  }

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
