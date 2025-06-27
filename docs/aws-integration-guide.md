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
5. Click **Create Integration**

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
