# GitLab Integration Guide

This guide will walk you through the process of setting up a GitLab integration with OwlHub. The integration requires creating a personal access token in your GitLab account that grants OwlHub permission to access your GitLab resources.

## Prerequisites

- A GitLab account with administrator access
- Access to GitLab settings
- OwlHub account with permissions to add integrations

## Step 1: Determine Your GitLab URL

1. Identify the URL of your GitLab instance:
   - For GitLab.com: `https://gitlab.com`
   - For self-hosted GitLab: `https://gitlab.your-company.com`

## Step 2: Create a Personal Access Token in GitLab

1. Log in to your GitLab account
2. Click on your profile picture in the top-right corner
3. Select **Preferences**
4. In the left sidebar, click on **Access Tokens**
5. Enter a name for your token (e.g., "OwlHub Integration")
6. Set an expiration date (optional, but recommended for security)
7. Select the following scopes:
   - `read_api` - To read resources via the API
   - `read_user` - To read user information
   - `read_repository` - To read repositories
   - `read_registry` - To read container registries
8. Click **Create personal access token**
9. Copy the generated token (you won't be able to see it again)

## Step 3: Complete the Integration in OwlHub

1. In OwlHub, navigate to **Integrations** > **Add New Integration**
2. Select **GitLab** as the integration type
3. Enter a name for your integration (e.g., "GitLab Production")
4. Enter your GitLab URL in the **GitLab URL** field
   - For GitLab.com: `https://gitlab.com`
   - For self-hosted GitLab: `https://gitlab.your-company.com`
5. Paste the personal access token you copied in Step 2 into the **Personal Access Token** field
6. Click **Create Integration**

## Step 4: Verify the Integration

After creating the integration, OwlHub will attempt to connect to your GitLab account using the provided credentials:

1. The integration status will initially show as "Pending"
2. If the connection is successful, the status will change to "Connected"
3. If there's an issue with the connection, the status will show as "Failed" with an error message
   - Common issues include incorrect GitLab URL, invalid personal access token, or insufficient permissions

## Step 5: Integration Features

Once connected, OwlHub will:

1. Fetch members from your GitLab projects
2. Identify security findings in your GitLab repositories
3. Monitor for vulnerabilities and security issues
4. Provide recommendations for improving security

## Security Considerations

- The personal access token you create only grants access to the resources that your GitLab user has permission to access
- OwlHub securely stores your GitLab URL and personal access token
- You can revoke OwlHub's access at any time by deleting the personal access token in your GitLab account
- Consider setting an expiration date for your personal access token and rotating it regularly

## Troubleshooting

If you encounter issues with the integration:

1. Verify that the GitLab URL is correct and includes the protocol (https://)
2. Confirm that the personal access token is valid and has not expired
3. Check that your GitLab user has the necessary permissions
4. Ensure that your GitLab instance is accessible from external services
5. Verify that there are no network restrictions preventing the connection

For additional assistance, contact OwlHub support.