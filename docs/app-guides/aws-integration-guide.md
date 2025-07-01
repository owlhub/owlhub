# AWS Integration Guide

This guide will walk you through the process of setting up an AWS integration with OwlHub. The integration requires creating an IAM role in your AWS account that grants OwlHub permission to access your AWS resources.

## Prerequisites

- An AWS account with administrator access
- Access to the AWS Management Console
- OwlHub account with permissions to add integrations

## Step 1: Generate an External ID

When you start the integration process in OwlHub, you'll be provided with a unique External ID. This ID is used to establish a secure trust relationship between your AWS account and OwlHub.

1. In OwlHub, navigate to **Integrations** > **Add New Integration**
2. Select **AWS** as the integration type
3. Note the automatically generated **External ID**: `{{EXTERNAL_ID}}`
   - This ID is unique to your OwlHub account and will be used in the next steps
   - Do not share this External ID with anyone outside your organization

## Step 2: Create an IAM Role in AWS

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/)
2. Navigate to the IAM service (search for "IAM" in the services search bar)
3. In the left navigation pane, click on **Roles**
4. Click the **Create role** button
5. Select **Another AWS account** as the trusted entity type
6. In the **Account ID** field, enter OwlHub's AWS account ID: `123456789012` (replace with actual OwlHub AWS account ID)
7. Check the box for **Require external ID**
8. Enter the External ID you noted from OwlHub in Step 1
9. Click **Next: Permissions**

## Step 3: Attach Permissions to the IAM Role

OwlHub requires specific permissions to scan your AWS environment for security findings. Attach the following AWS managed policies:

1. In the permissions page, search for and select the following policies:
   - `SecurityAudit` - Provides read-only access to security configuration

   If you plan to use Organization Mode (see below), also add:
   - `AWSOrganizationsReadOnlyAccess` - Provides read-only access to AWS Organizations

2. Click **Next: Tags** (adding tags is optional)
3. Click **Next: Review**
4. Enter a name for the role (e.g., `OwlHub_CASB_Auditor`)
5. Enter a description (e.g., `Role for OwlHub security scanning integration`)
6. Review the settings to ensure they're correct
7. Click **Create role**

## Step 4: Copy the IAM Role ARN

After creating the role, you need to copy its ARN (Amazon Resource Name) to provide to OwlHub:

1. In the IAM console, click on **Roles** in the left navigation pane
2. Find and click on the role you just created (`OwlHub_CASB_Auditor`)
3. At the top of the summary page, you'll see the **Role ARN**
4. Copy the entire ARN (it should look like `arn:aws:iam::123456789012:role/OwlHub_CASB_Auditor`)

## Step 5: Complete the Integration in OwlHub

1. Return to the OwlHub integration setup page
2. Enter a name for your integration (e.g., "AWS Production Account")
3. Paste the IAM Role ARN you copied in Step 4 into the **IAM Role ARN** field
4. Confirm that the External ID matches the one you used when creating the IAM role
5. (Optional) Enable **Organization Mode** if you want to automatically discover and add all AWS accounts in your organization (see below)
6. Click **Create Integration**

### Organization Mode

Organization Mode allows OwlHub to automatically discover all AWS accounts in your organization and create integrations for them. This is useful if you have multiple AWS accounts and want to monitor them all from a single OwlHub instance.

**Prerequisites for Organization Mode:**

- The IAM role must be created in the AWS Organizations management account
- The IAM role must have the `AWSOrganizationsReadOnlyAccess` policy attached
- The same IAM role name must exist in all member accounts with the same permissions
- All member accounts must trust the OwlHub AWS account with the same External ID

**How Organization Mode works:**

1. When enabled, OwlHub will use the AWS Organizations API to discover all accounts in your organization
2. For each discovered account, OwlHub will create a new integration using the same role name pattern
3. The integration name will include the account name and ID for easy identification
4. Findings for each account will be tracked separately in OwlHub

**Note:** If you enable Organization Mode, make sure the IAM role exists in all member accounts with the same name and permissions. You can use AWS CloudFormation StackSets or AWS Organizations Service Control Policies to deploy the role across your organization.

### Deploying IAM Roles Across Your Organization

To simplify the deployment of the required IAM role across all accounts in your AWS organization, OwlHub provides a CloudFormation template and deployment guide. This approach is recommended when using Organization Mode.

#### Using CloudFormation StackSets

CloudFormation StackSets allows you to deploy the IAM role to all accounts in your organization with a single operation:

1. Download the [OwlHub IAM Role CloudFormation Template](/assets/templates/owlhub-role-template.yaml)
2. Follow the instructions in the [StackSet Deployment Guide](/integrations/guide/aws-stackset-deployment-guide.md)

The CloudFormation template automatically:
- Creates the IAM role with the necessary permissions
- Sets up the trust relationship with OwlHub's AWS account
- Configures a unique External ID for each account (base External ID + account ID)
- Ensures consistent role configuration across all accounts

When using this approach with Organization Mode:
1. Deploy the CloudFormation template to all accounts using StackSets
2. In OwlHub, use the base External ID (without account suffix) when setting up the integration
3. Enable Organization Mode
4. OwlHub will automatically discover all accounts and create integrations with the correct account-specific External IDs

## Step 6: Verify the Integration

After creating the integration, OwlHub will attempt to connect to your AWS account using the provided credentials:

1. The integration status will initially show as "Pending"
2. If the connection is successful, the status will change to "Connected"
3. If there's an issue with the connection, the status will show as "Failed" with an error message
   - Common issues include incorrect IAM Role ARN, insufficient permissions, or mismatched External ID

## Security Considerations

- The IAM role you create only grants read-only access to your AWS resources
- The External ID ensures that only OwlHub can assume the role
- OwlHub never stores your AWS credentials, only the IAM Role ARN and External ID
- You can revoke OwlHub's access at any time by deleting the IAM role in your AWS account

## Troubleshooting

If you encounter issues with the integration:

1. Verify that the IAM Role ARN is correct
2. Confirm that the External ID matches exactly
3. Check that the IAM role has the required permissions
4. Ensure that the trust relationship is configured correctly
5. Verify that your AWS account doesn't have restrictions that prevent cross-account access

For additional assistance, contact OwlHub support.
