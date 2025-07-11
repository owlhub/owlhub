/**
 * HttpApp.ts
 * 
 * Implementation of the HTTP app for making API requests in flows.
 */

import { AppDefinition, AppAction } from '../AppNodeInterface';

// Define the HTTP app
const HttpApp: AppDefinition = {
  id: 'http',
  name: 'HTTP',
  description: 'Make HTTP requests to external APIs',
  icon: 'globe', // Assuming we have an icon system
  color: '#4f46e5', // Indigo color
  category: 'Core',
  
  actions: [
    // GET request action
    {
      id: 'get',
      name: 'GET Request',
      description: 'Make a GET request to a URL',
      inputs: [
        {
          id: 'url',
          label: 'URL',
          type: 'string',
          required: true,
          placeholder: 'https://api.example.com/data',
          description: 'The URL to send the request to',
          validation: {
            pattern: '^https?://.+',
          },
        },
        {
          id: 'headers',
          label: 'Headers',
          type: 'object',
          required: false,
          default: {},
          description: 'HTTP headers to include in the request',
        },
        {
          id: 'queryParams',
          label: 'Query Parameters',
          type: 'object',
          required: false,
          default: {},
          description: 'Query parameters to append to the URL',
        },
      ],
      outputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'number',
            description: 'HTTP status code',
          },
          headers: {
            type: 'object',
            description: 'Response headers',
          },
          data: {
            type: 'object',
            description: 'Response data',
          },
        },
      },
      execute: async (inputs, authConfig) => {
        try {
          // Build URL with query parameters
          const url = new URL(inputs.url);
          if (inputs.queryParams) {
            Object.entries(inputs.queryParams).forEach(([key, value]) => {
              url.searchParams.append(key, String(value));
            });
          }
          
          // Make the request
          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: inputs.headers || {},
          });
          
          // Parse the response
          const data = await response.json();
          
          // Return the result
          return {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            data,
          };
        } catch (error) {
          throw new Error(`HTTP GET request failed: ${error.message}`);
        }
      },
    },
    
    // POST request action
    {
      id: 'post',
      name: 'POST Request',
      description: 'Make a POST request to a URL',
      inputs: [
        {
          id: 'url',
          label: 'URL',
          type: 'string',
          required: true,
          placeholder: 'https://api.example.com/data',
          description: 'The URL to send the request to',
          validation: {
            pattern: '^https?://.+',
          },
        },
        {
          id: 'headers',
          label: 'Headers',
          type: 'object',
          required: false,
          default: { 'Content-Type': 'application/json' },
          description: 'HTTP headers to include in the request',
        },
        {
          id: 'body',
          label: 'Body',
          type: 'object',
          required: false,
          default: {},
          description: 'Request body to send',
        },
      ],
      outputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'number',
            description: 'HTTP status code',
          },
          headers: {
            type: 'object',
            description: 'Response headers',
          },
          data: {
            type: 'object',
            description: 'Response data',
          },
        },
      },
      execute: async (inputs, authConfig) => {
        try {
          // Make the request
          const response = await fetch(inputs.url, {
            method: 'POST',
            headers: inputs.headers || { 'Content-Type': 'application/json' },
            body: JSON.stringify(inputs.body || {}),
          });
          
          // Parse the response
          const data = await response.json();
          
          // Return the result
          return {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            data,
          };
        } catch (error) {
          throw new Error(`HTTP POST request failed: ${error.message}`);
        }
      },
    },
  ],
};


export default HttpApp;