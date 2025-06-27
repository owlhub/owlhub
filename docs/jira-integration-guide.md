# Jira Integration Guide

This guide will walk you through the process of setting up a Jira integration with OwlHub. The integration requires creating an API token in your Jira account that grants OwlHub permission to access your Jira resources.

## Prerequisites

- A Jira account with administrator access
- Access to Jira settings
- OwlHub account with permissions to add integrations

## Step 1: Determine Your Jira Site URL

1. Log in to your Jira account
2. Note your Jira site URL, which typically follows this format:
   - For Jira Cloud: `https://your-domain.atlassian.net`
   - For Jira Server/Data Center: `https://jira.your-company.com`

## Step 2: Create an API Token in Jira

1. Log in to your Atlassian account at [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Enter a label for your token (e.g., "OwlHub Integration")
4. Click **Create**
5. Copy the generated API token (you won't be able to see it again)

## Step 3: Complete the Integration in OwlHub

1. In OwlHub, navigate to **Integrations** > **Add New Integration**
2. Select **Jira** as the integration type
3. Enter a name for your integration (e.g., "Jira Production")
4. Enter your Jira Site URL in the **Jira Site URL** field
   - For Jira Cloud: `https://your-domain.atlassian.net`
   - For Jira Server/Data Center: `https://jira.your-company.com`
5. Paste the API token you copied in Step 2 into the **Access Token** field
6. Click **Create Integration**

## Step 4: Verify the Integration

After creating the integration, OwlHub will attempt to connect to your Jira account using the provided credentials:

1. The integration status will initially show as "Pending"
2. If the connection is successful, the status will change to "Connected"
3. If there's an issue with the connection, the status will show as "Failed" with an error message
   - Common issues include incorrect Jira Site URL, invalid API token, or insufficient permissions

## Security Considerations

- The API token you create only grants access to the resources that your Jira user has permission to access
- OwlHub securely stores your Jira Site URL and API token
- You can revoke OwlHub's access at any time by deleting the API token in your Atlassian account

## Troubleshooting

If you encounter issues with the integration:

1. Verify that the Jira Site URL is correct and includes the protocol (https://)
2. Confirm that the API token is valid and has not expired
3. Check that your Jira user has the necessary permissions
4. Ensure that your Jira instance is accessible from external services
5. Verify that there are no network restrictions preventing the connection

For additional assistance, contact OwlHub support.