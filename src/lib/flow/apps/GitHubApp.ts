/**
 * GitHubApp.ts
 * 
 * Implementation of the GitHub app for interacting with GitHub repositories in flows.
 */

import { AppDefinition, AppAction } from '../AppNodeInterface';

// Define the GitHub app
const GitHubApp: AppDefinition = {
  id: 'github',
  name: 'GitHub',
  description: 'Interact with GitHub repositories, issues, and pull requests',
  icon: 'github', // Assuming we have an icon system
  color: '#24292e', // GitHub color
  category: 'Development',
  defaultAuthType: 'oauth2',
  defaultAuthConfig: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'repo',
  },
  
  actions: [
    // List repositories action
    {
      id: 'listRepos',
      name: 'List Repositories',
      description: 'Get a list of repositories for the authenticated user',
      inputs: [
        {
          id: 'visibility',
          label: 'Visibility',
          type: 'string',
          required: false,
          default: 'all',
          options: [
            { label: 'All', value: 'all' },
            { label: 'Public', value: 'public' },
            { label: 'Private', value: 'private' },
          ],
          description: 'Filter repositories by visibility',
        },
        {
          id: 'sort',
          label: 'Sort By',
          type: 'string',
          required: false,
          default: 'updated',
          options: [
            { label: 'Last Updated', value: 'updated' },
            { label: 'Name', value: 'full_name' },
            { label: 'Created', value: 'created' },
          ],
          description: 'Sort repositories by this field',
        },
        {
          id: 'perPage',
          label: 'Results Per Page',
          type: 'number',
          required: false,
          default: 30,
          validation: {
            min: 1,
            max: 100,
          },
          description: 'Number of repositories to return per page',
        },
      ],
      outputSchema: {
        type: 'object',
        properties: {
          repositories: {
            type: 'array',
            description: 'List of repositories',
          },
          totalCount: {
            type: 'number',
            description: 'Total number of repositories',
          },
        },
      },
      execute: async (inputs, authConfig) => {
        try {
          if (!authConfig || !authConfig.accessToken) {
            throw new Error('GitHub authentication is required');
          }
          
          // Build URL with query parameters
          const url = new URL('https://api.github.com/user/repos');
          url.searchParams.append('visibility', inputs.visibility || 'all');
          url.searchParams.append('sort', inputs.sort || 'updated');
          url.searchParams.append('per_page', String(inputs.perPage || 30));
          
          // Make the request
          const response = await fetch(url.toString(), {
            headers: {
              'Authorization': `token ${authConfig.accessToken}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`GitHub API error: ${response.statusText}`);
          }
          
          // Parse the response
          const repositories = await response.json();
          
          // Return the result
          return {
            repositories,
            totalCount: repositories.length,
          };
        } catch (error) {
          throw new Error(`GitHub list repositories failed: ${error.message}`);
        }
      },
    },
    
    // Create issue action
    {
      id: 'createIssue',
      name: 'Create Issue',
      description: 'Create a new issue in a repository',
      inputs: [
        {
          id: 'owner',
          label: 'Repository Owner',
          type: 'string',
          required: true,
          description: 'The owner of the repository',
        },
        {
          id: 'repo',
          label: 'Repository Name',
          type: 'string',
          required: true,
          description: 'The name of the repository',
        },
        {
          id: 'title',
          label: 'Issue Title',
          type: 'string',
          required: true,
          description: 'The title of the issue',
        },
        {
          id: 'body',
          label: 'Issue Body',
          type: 'string',
          required: false,
          description: 'The body text of the issue',
        },
        {
          id: 'labels',
          label: 'Labels',
          type: 'array',
          required: false,
          description: 'Labels to apply to the issue',
        },
        {
          id: 'assignees',
          label: 'Assignees',
          type: 'array',
          required: false,
          description: 'GitHub usernames to assign to the issue',
        },
      ],
      outputSchema: {
        type: 'object',
        properties: {
          issue: {
            type: 'object',
            description: 'The created issue',
          },
          url: {
            type: 'string',
            description: 'URL of the created issue',
          },
        },
      },
      execute: async (inputs, authConfig) => {
        try {
          if (!authConfig || !authConfig.accessToken) {
            throw new Error('GitHub authentication is required');
          }
          
          // Build URL
          const url = `https://api.github.com/repos/${inputs.owner}/${inputs.repo}/issues`;
          
          // Prepare request body
          const body = {
            title: inputs.title,
            body: inputs.body || '',
            labels: inputs.labels || [],
            assignees: inputs.assignees || [],
          };
          
          // Make the request
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `token ${authConfig.accessToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
          
          if (!response.ok) {
            throw new Error(`GitHub API error: ${response.statusText}`);
          }
          
          // Parse the response
          const issue = await response.json();
          
          // Return the result
          return {
            issue,
            url: issue.html_url,
          };
        } catch (error) {
          throw new Error(`GitHub create issue failed: ${error.message}`);
        }
      },
    },
  ],
};

export default GitHubApp;