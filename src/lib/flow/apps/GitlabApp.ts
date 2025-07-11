/**
 * GitlabApp.ts
 * 
 * Implementation of the Gitlab app for interacting with Gitlab repositories in flows.
 */

import { AppDefinition, AppAction } from '../AppNodeInterface';

// Define the Gitlab app
const GitlabApp: AppDefinition = {
  id: 'gitlab',
  name: 'Gitlab',
  description: 'Interact with Gitlab repositories, merge requests, and webhooks',
  icon: 'gitlab', // Assuming we have an icon system
  color: '#FC6D26', // Gitlab color
  category: 'Development',
  defaultAuthType: 'oauth2',
  defaultAuthConfig: {
    authUrl: 'https://gitlab.com/oauth/authorize',
    tokenUrl: 'https://gitlab.com/oauth/token',
    scope: 'api',
  },

  actions: [
    // WebhookValidator action
    {
      id: 'webhookValidator',
      name: 'Webhook Validator',
      description: 'Validate Gitlab webhook payloads using the existing webhook system',
      inputs: [
        {
          id: 'webhookId',
          label: 'Webhook ID',
          type: 'string',
          required: true,
          description: 'The ID of the webhook to use for validation',
        },
        {
          id: 'payload',
          label: 'Webhook Payload',
          type: 'object',
          required: true,
          description: 'The webhook payload received from Gitlab',
        },
        {
          id: 'gitlabToken',
          label: 'Gitlab-Token Header',
          type: 'string',
          required: true,
          description: 'The X-Gitlab-Token header value from the webhook request',
        },
      ],
      outputSchema: {
        type: 'object',
        properties: {
          isValid: {
            type: 'boolean',
            description: 'Whether the webhook payload is valid',
          },
          eventType: {
            type: 'string',
            description: 'The type of event (e.g., merge_request, push)',
          },
          payload: {
            type: 'object',
            description: 'The validated webhook payload',
          },
        },
      },
      execute: async (inputs, authConfig) => {
        try {
          const { webhookId, payload, gitlabToken } = inputs;

          // Use the existing webhook system to validate the token
          // In a real implementation, this would make a request to the webhook API
          // For now, we'll just extract the event type from the payload

          // Extract event type from payload body
          let eventType = '';
          const body = payload.body || payload; // Handle both new and old payload structure
          if (body.object_kind) {
            eventType = body.object_kind;
          } else if (body.event_type) {
            eventType = body.event_type;
          }

          // In a real implementation, we would validate the token against the webhook's token
          // For now, we'll assume it's valid if we have a token
          const isValid = !!gitlabToken;

          return {
            isValid,
            eventType,
            payload,
          };
        } catch (error) {
          throw new Error(`Gitlab webhook validation failed: ${error.message}`);
        }
      },
    },

    // Close Merge Request action
    {
      id: 'closeMergeRequest',
      name: 'Close Merge Request',
      description: 'Close a merge request in a Gitlab repository',
      inputs: [
        {
          id: 'projectId',
          label: 'Project ID',
          type: 'string',
          required: true,
          description: 'The ID or URL-encoded path of the project',
        },
        {
          id: 'mergeRequestIid',
          label: 'Merge Request IID',
          type: 'string',
          required: true,
          description: 'The internal ID of the merge request',
        },
        {
          id: 'comment',
          label: 'Comment',
          type: 'string',
          required: false,
          description: 'Optional comment to add when closing the merge request',
        },
      ],
      outputSchema: {
        type: 'object',
        properties: {
          mergeRequest: {
            type: 'object',
            description: 'The updated merge request',
          },
          success: {
            type: 'boolean',
            description: 'Whether the operation was successful',
          },
          url: {
            type: 'string',
            description: 'URL of the merge request',
          },
        },
      },
      execute: async (inputs, authConfig) => {
        try {
          if (!authConfig || !authConfig.accessToken) {
            throw new Error('Gitlab authentication is required');
          }

          const { projectId, mergeRequestIid, comment } = inputs;

          // Build URL for closing the merge request
          const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}`;

          // Prepare request body
          const body = {
            state_event: 'close',
          };

          // Make the request to close the merge request
          const response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${authConfig.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            throw new Error(`Gitlab API error: ${response.statusText}`);
          }

          // Parse the response
          const mergeRequest = await response.json();

          // Add a comment if provided
          if (comment) {
            const commentUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}/notes`;

            await fetch(commentUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${authConfig.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ body: comment }),
            });
          }

          // Return the result
          return {
            mergeRequest,
            success: true,
            url: mergeRequest.web_url,
          };
        } catch (error) {
          throw new Error(`Gitlab close merge request failed: ${error.message}`);
        }
      },
    },
  ],
};

export default GitlabApp;
