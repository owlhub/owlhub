# Deploying OwlHub IAM Role Across AWS Organization

This guide explains how to deploy the OwlHub integration IAM role across all accounts in your AWS organization using AWS CloudFormation StackSets.

## Prerequisites

- AWS Organizations must be set up with all member accounts
- You must have administrator access to the organization management account
- AWS CloudFormation StackSets must be enabled for your organization

## Step 1: Enable Trusted Access for CloudFormation StackSets

Before you can deploy StackSets across your organization, you need to enable trusted access for CloudFormation StackSets:

1. Sign in to the AWS Management Console as an administrator of the management account
2. Navigate to the AWS Organizations console
3. In the left navigation pane, choose **Services**
4. Find **CloudFormation StackSets** in the list and choose **Enable trusted access**

## Step 2: Create a StackSet

1. Sign in to the AWS Management Console as an administrator of the management account
2. Navigate to the AWS CloudFormation console
3. In the left navigation pane, choose **StackSets**
4. Choose **Create StackSet**
5. For **Permissions**, choose **Service-managed permissions**
6. For **Template source**, choose **Upload a template file**
7. Upload the `owlhub-role-template.yaml` file
8. Choose **Next**
9. Enter a name for the StackSet (e.g., `OwlHub-CASB-Auditor`)
10. Enter the parameters:
    - **OwlHubAccountId**: The AWS account ID of OwlHub (provided by OwlHub)
    - **BaseExternalId**: The base external ID provided by OwlHub (without account ID suffix)
    - **RoleName**: The name of the IAM role to create (e.g., `OwlHub_CASB_Auditor`)
11. Choose **Next**
12. For **Deployment targets**, choose **Deploy to organization**
13. For **Automatic deployment**, choose whether to automatically deploy to new accounts added to your organization
14. For **Regions**, select the regions where you want to deploy the role (at minimum, select `us-east-1`)
15. Choose **Next**
16. Review the settings and choose **Create StackSet**

## Step 3: Monitor the Deployment

1. In the CloudFormation console, choose **StackSets**
2. Select the StackSet you created
3. Choose the **Operations** tab to monitor the deployment progress
4. The status will change to **SUCCEEDED** when the deployment is complete

## Step 4: Verify the Deployment

To verify that the IAM role has been created in all accounts:

1. Sign in to a member account
2. Navigate to the IAM console
3. In the left navigation pane, choose **Roles**
4. Verify that the role `OwlHub_CASB_Auditor` exists
5. Repeat for other member accounts as needed

## Step 5: Configure OwlHub Integration

After deploying the IAM role to all accounts, you can configure the OwlHub integration:

1. In OwlHub, navigate to **Integrations** > **Add New Integration**
2. Select **AWS** as the integration type
3. Enter the IAM Role ARN for the management account: `arn:aws:iam::<management-account-id>:role/OwlHub_CASB_Auditor`
4. Enter the base External ID provided by OwlHub
5. Enable **Organization Mode**
6. Click **Create Integration**

OwlHub will automatically discover all accounts in your organization and create integrations for them using the unique external ID format (base external ID + account ID).

## Updating the StackSet

If you need to update the IAM role configuration in the future:

1. Navigate to the AWS CloudFormation console
2. Choose **StackSets**
3. Select the StackSet you created
4. Choose **Actions** > **Edit StackSet details**
5. Follow the prompts to update the template or parameters
6. The changes will be deployed to all accounts in your organization

## Troubleshooting

If you encounter issues with the deployment:

1. Check the CloudFormation events for any failed deployments
2. Verify that the management account has the necessary permissions to deploy to member accounts
3. Ensure that the member accounts have not reached their IAM role limit
4. Check that the external ID format is correct in both the CloudFormation template and OwlHub