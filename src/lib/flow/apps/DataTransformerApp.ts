/**
 * DataTransformerApp.ts
 * 
 * Implementation of the Data Transformer app for manipulating data in flows.
 * This app provides various data transformation operations without requiring external API calls.
 */

import { AppDefinition, AppAction } from '../AppNodeInterface';

// Define the Data Transformer app
const DataTransformerApp: AppDefinition = {
  id: 'dataTransformer',
  name: 'Data Transformer',
  description: 'Transform, filter, and manipulate data in your flows',
  icon: 'magic', // Assuming we have an icon system
  color: '#8b5cf6', // Purple color
  category: 'Utilities',
  
  actions: [
    // JSON to CSV action
    {
      id: 'jsonToCsv',
      name: 'JSON to CSV',
      description: 'Convert JSON array to CSV format',
      inputs: [
        {
          id: 'data',
          label: 'JSON Array',
          type: 'array',
          required: true,
          description: 'Array of objects to convert to CSV',
        },
        {
          id: 'includeHeaders',
          label: 'Include Headers',
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include column headers in the CSV output',
        },
        {
          id: 'delimiter',
          label: 'Delimiter',
          type: 'string',
          required: false,
          default: ',',
          description: 'Character to use as delimiter',
        },
      ],
      outputSchema: {
        type: 'object',
        properties: {
          csv: {
            type: 'string',
            description: 'CSV formatted string',
          },
          rowCount: {
            type: 'number',
            description: 'Number of rows in the CSV',
          },
        },
      },
      execute: async (inputs) => {
        try {
          const data = inputs.data;
          const includeHeaders = inputs.includeHeaders !== false;
          const delimiter = inputs.delimiter || ',';
          
          if (!Array.isArray(data) || data.length === 0) {
            return { csv: '', rowCount: 0 };
          }
          
          // Get all possible headers from all objects
          const headers = Array.from(
            new Set(
              data.flatMap(obj => Object.keys(obj))
            )
          );
          
          // Generate CSV rows
          const rows = [];
          
          // Add headers row if requested
          if (includeHeaders) {
            rows.push(headers.join(delimiter));
          }
          
          // Add data rows
          data.forEach(obj => {
            const row = headers.map(header => {
              const value = obj[header];
              // Handle different value types
              if (value === null || value === undefined) {
                return '';
              } else if (typeof value === 'object') {
                return JSON.stringify(value).replace(/"/g, '""');
              } else {
                return String(value).replace(/"/g, '""');
              }
            });
            rows.push(row.join(delimiter));
          });
          
          return {
            csv: rows.join('\n'),
            rowCount: data.length,
          };
        } catch (error) {
          throw new Error(`JSON to CSV conversion failed: ${error.message}`);
        }
      },
    },
    
    // Filter Array action
    {
      id: 'filterArray',
      name: 'Filter Array',
      description: 'Filter an array based on a condition',
      inputs: [
        {
          id: 'data',
          label: 'Array',
          type: 'array',
          required: true,
          description: 'Array to filter',
        },
        {
          id: 'field',
          label: 'Field',
          type: 'string',
          required: true,
          description: 'Field to filter on',
        },
        {
          id: 'operator',
          label: 'Operator',
          type: 'string',
          required: true,
          options: [
            { label: 'Equals', value: 'eq' },
            { label: 'Not Equals', value: 'neq' },
            { label: 'Greater Than', value: 'gt' },
            { label: 'Less Than', value: 'lt' },
            { label: 'Contains', value: 'contains' },
          ],
          description: 'Comparison operator',
        },
        {
          id: 'value',
          label: 'Value',
          type: 'string',
          required: true,
          description: 'Value to compare against',
        },
      ],
      outputSchema: {
        type: 'object',
        properties: {
          result: {
            type: 'array',
            description: 'Filtered array',
          },
          count: {
            type: 'number',
            description: 'Number of items in the filtered array',
          },
        },
      },
      execute: async (inputs) => {
        try {
          const data = inputs.data;
          const field = inputs.field;
          const operator = inputs.operator;
          const value = inputs.value;
          
          if (!Array.isArray(data)) {
            throw new Error('Input data must be an array');
          }
          
          // Define comparison functions
          const comparisons = {
            eq: (a, b) => a == b,
            neq: (a, b) => a != b,
            gt: (a, b) => a > b,
            lt: (a, b) => a < b,
            contains: (a, b) => String(a).includes(String(b)),
          };
          
          // Apply filter
          const result = data.filter(item => {
            const itemValue = item[field];
            const compareFunc = comparisons[operator];
            
            if (!compareFunc) {
              throw new Error(`Unknown operator: ${operator}`);
            }
            
            return compareFunc(itemValue, value);
          });
          
          return {
            result,
            count: result.length,
          };
        } catch (error) {
          throw new Error(`Filter array failed: ${error.message}`);
        }
      },
    },
    
    // Transform Object action
    {
      id: 'transformObject',
      name: 'Transform Object',
      description: 'Transform an object using a template',
      inputs: [
        {
          id: 'data',
          label: 'Input Object',
          type: 'object',
          required: true,
          description: 'Object to transform',
        },
        {
          id: 'template',
          label: 'Template',
          type: 'object',
          required: true,
          description: 'Template object with field mappings',
        },
      ],
      outputSchema: {
        type: 'object',
        properties: {
          result: {
            type: 'object',
            description: 'Transformed object',
          },
        },
      },
      execute: async (inputs) => {
        try {
          const data = inputs.data;
          const template = inputs.template;
          
          if (typeof data !== 'object' || data === null) {
            throw new Error('Input data must be an object');
          }
          
          if (typeof template !== 'object' || template === null) {
            throw new Error('Template must be an object');
          }
          
          // Helper function to get nested property value
          const getNestedValue = (obj, path) => {
            const keys = path.split('.');
            return keys.reduce((o, key) => (o && o[key] !== undefined) ? o[key] : undefined, obj);
          };
          
          // Process template recursively
          const processTemplate = (tmpl) => {
            if (typeof tmpl === 'string' && tmpl.startsWith('$.')) {
              // It's a path reference, get the value from data
              const path = tmpl.substring(2);
              return getNestedValue(data, path);
            } else if (Array.isArray(tmpl)) {
              // Process array items
              return tmpl.map(item => processTemplate(item));
            } else if (typeof tmpl === 'object' && tmpl !== null) {
              // Process object properties
              const result = {};
              for (const key in tmpl) {
                result[key] = processTemplate(tmpl[key]);
              }
              return result;
            } else {
              // Return primitive values as is
              return tmpl;
            }
          };
          
          const result = processTemplate(template);
          
          return { result };
        } catch (error) {
          throw new Error(`Transform object failed: ${error.message}`);
        }
      },
    },
  ],
};

export default DataTransformerApp;