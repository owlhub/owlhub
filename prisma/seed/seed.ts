import { PrismaClient, AppType } from '@prisma/client';

// Define interfaces for our data structures
interface ActionData {
  name: string;
  description: string;
}

interface SecurityFindingData {
  key: string;
  name: string;
  severity: string;
  description: string;
}

const prisma = new PrismaClient();

async function main() {
  // Define app types with their configurations
  const appTypesData = [
    {
      name: 'GitLab',
      description: 'Identify important security issues across your Gitlab organizations.',
      icon: 'gitlab',
      guide: 'gitlab-integration-guide.md',
      configFields: JSON.stringify([
        {
          name: 'gitlabUrl',
          label: 'GitLab URL',
          type: 'text',
          required: true,
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
        }
      ])
    }
  ];

  // Get all existing app types
  const existingAppTypes = await prisma.appType.findMany();
  const existingAppTypeNames = existingAppTypes.map(appType => appType.name);

  // Track processed app types to identify which ones to delete later
  const processedAppTypeIds: string[] = [];

  // Process each app type
  const appTypeMap: Record<string, AppType> = {};

  for (const appTypeData of appTypesData) {
    let appType;

    // Check if app type already exists
    const existingAppType = existingAppTypes.find(at => at.name === appTypeData.name);

    if (existingAppType) {
      // Update existing app type
      appType = await prisma.appType.update({
        where: { id: existingAppType.id },
        data: appTypeData
      });
      console.log(`Updated app type: ${appType.name}`);
    } else {
      // Create new app type
      appType = await prisma.appType.create({
        data: appTypeData
      });
      console.log(`Created app type: ${appType.name}`);
    }

    processedAppTypeIds.push(appType.id);
    appTypeMap[appType.name] = appType;
  }

  // Delete app types that are no longer in the seeder
  const appTypesToDelete = existingAppTypes.filter(appType => !processedAppTypeIds.includes(appType.id));
  for (const appType of appTypesToDelete) {
    await prisma.appType.delete({
      where: { id: appType.id }
    });
    console.log(`Deleted app type: ${appType.name}`);
  }

  // Define security findings data for each app type
  const securityFindingsData: Record<string, SecurityFindingData[]> = {
    'GitLab': [
      {
        "key": "gitlab_public_project",
        "name": "Public Repository",
        "severity": "high",
        "description": "The repository is publicly accessible, which may expose sensitive code or information."
      },
      {
        "key": "gitlab_unprotected_default_branch",
        "name": "Unprotected Default Branch",
        "severity": "high",
        "description": "The default branch is not protected, allowing direct pushes and force-pushes that can compromise code integrity."
      },
      {
        "key": "gitlab_repo_access_without_expiry",
        "name": "Repository Access without Expiry",
        "severity": "high",
        "description": "Users have access to repositories without an expiry date, posing a risk of unauthorized long-term access."
      },
      {
        "key": "gitlab_repo_owner_with_expiry",
        "name": "Repository Owner have expiry",
        "severity": "high",
        "description": "Repository Owner have an expiry date, posing a risk of loosing access to repo after expiry."
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
        "key": "aws_iam_user_access_key_not_rotated",
        "name": "IAM Access Key Not Rotated",
        "severity": "high",
        "description": "IAM user access keys that have not been rotated in over 90 days, increasing the risk of unauthorized access."
      },
      // {
      //   "key": "aws_public_s3_bucket",
      //   "name": "Public S3 Bucket",
      //   "severity": "critical",
      //   "description": "S3 bucket with public read or write access, potentially exposing sensitive data to the internet."
      // },
      //
      // {
      //   "key": "aws_root_account_access_key",
      //   "name": "Root Account Access Key",
      //   "severity": "critical",
      //   "description": "AWS root account has active access keys, which is a security best practice violation."
      // },
      // {
      //   "key": "aws_unencrypted_ebs_volume",
      //   "name": "Unencrypted EBS Volume",
      //   "severity": "high",
      //   "description": "EBS volumes that are not encrypted, potentially exposing sensitive data if the volume is compromised."
      // }
    ]
  };

  // Define actions data for each app type
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

  // Process security findings for each app type
  for (const [appTypeName, findings] of Object.entries(securityFindingsData)) {
    const appType = appTypeMap[appTypeName];
    if (!appType) continue;

    // Get existing security findings for this app type
    const existingFindings = await prisma.securityFinding.findMany({
      where: { appTypeId: appType.id }
    });

    // Track processed findings to identify which ones to delete later
    const processedFindingIds: string[] = [];

    // Process each finding
    for (const findingData of findings) {
      // Add appTypeId to the finding data
      const completeData = { ...findingData, appTypeId: appType.id };

      // Check if finding already exists (match by key and appTypeId)
      const existingFinding = existingFindings.find(f => 
        (f as any).key === findingData.key && f.appTypeId === appType.id
      );

      if (existingFinding) {
        // Update existing finding
        const updatedFinding = await prisma.securityFinding.update({
          where: { id: existingFinding.id },
          data: completeData
        });
        processedFindingIds.push(updatedFinding.id);
        console.log(`Updated security finding: ${updatedFinding.name} for ${appTypeName}`);
      } else {
        // Create new finding
        const newFinding = await prisma.securityFinding.create({
          data: completeData
        });
        processedFindingIds.push(newFinding.id);
        console.log(`Created security finding: ${newFinding.name} for ${appTypeName}`);
      }
    }

    // Delete findings that are no longer in the seeder
    const findingsToDelete = existingFindings.filter(finding => 
      !processedFindingIds.includes(finding.id)
    );

    for (const finding of findingsToDelete) {
      await prisma.securityFinding.delete({
        where: { id: finding.id }
      });
      console.log(`Deleted security finding: ${finding.name} for ${appTypeName}`);
    }
  }

  // Process actions for each app type
  for (const [appTypeName, actions] of Object.entries(actionsData)) {
    const appType = appTypeMap[appTypeName];
    if (!appType) continue;

    // Get existing actions for this app type
    const existingActions = await prisma.action.findMany({
      where: { appTypeId: appType.id }
    });

    // Track processed actions to identify which ones to delete later
    const processedActionIds: string[] = [];

    // Process each action
    for (const actionData of actions) {
      // Add appTypeId to the action data
      const completeData = { ...actionData, appTypeId: appType.id };

      // Check if action already exists (match by name and appTypeId)
      const existingAction = existingActions.find(a => 
        a.name === actionData.name && a.appTypeId === appType.id
      );

      if (existingAction) {
        // Update existing action
        const updatedAction = await prisma.action.update({
          where: { id: existingAction.id },
          data: completeData
        });
        processedActionIds.push(updatedAction.id);
        console.log(`Updated action: ${updatedAction.name} for ${appTypeName}`);
      } else {
        // Create new action
        const newAction = await prisma.action.create({
          data: completeData
        });
        processedActionIds.push(newAction.id);
        console.log(`Created action: ${newAction.name} for ${appTypeName}`);
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
      console.log(`Deleted action: ${action.name} for ${appTypeName}`);
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
