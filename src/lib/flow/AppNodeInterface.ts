/**
 * AppNodeInterface.ts
 * 
 * This file defines the interfaces and types for app nodes in the flow system.
 * It provides a standardized way to integrate different apps/services into the flow editor.
 */

// Type for app node configuration
export interface AppNodeConfig {
  // Basic app configuration
  appId: string;
  appName: string;
  nodeName?: string; // Custom node name for display
  appIcon?: string;

  // Action configuration
  actionId: string;
  actionName: string;

  // Input/Output configuration
  inputs: AppNodeInput[];
  outputSchema: AppNodeOutputSchema;

  // Authentication configuration
  authType?: 'none' | 'apiKey' | 'oauth2' | 'basic';
  authConfig?: Record<string, any>;

  // Additional configuration
  options?: Record<string, any>;
}

// Flow trigger types
export type FlowTriggerType = 'manual' | 'webhook' | 'scheduler';

// Scheduler configuration
export interface SchedulerConfig {
  frequency: 'minutely' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  interval?: number; // e.g., every 5 minutes, every 2 hours, etc.
  dayOfWeek?: number; // 0-6, where 0 is Sunday
  dayOfMonth?: number; // 1-31
  time?: string; // HH:MM format
}

// Webhook configuration
export interface WebhookConfig {
  path: string; // URL path for the webhook
  secret?: string; // Secret token for webhook validation
  description?: string;
}

// Flow trigger configuration
export interface FlowTriggerConfig {
  type: FlowTriggerType;
  scheduler?: SchedulerConfig;
  webhook?: WebhookConfig;
}

// Type for app node input
export interface AppNodeInput {
  id: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
  required: boolean;
  default?: any;
  description?: string;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  value?: any;
  mappedFrom?: {
    nodeId: string;
    outputId: string;
  };
}

// Type for app node output schema
export interface AppNodeOutputSchema {
  type: 'object';
  properties: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
    description?: string;
  }>;
}

// Interface for app definition
export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  category: string;
  actions: AppAction[];
  defaultAuthType?: 'none' | 'apiKey' | 'oauth2' | 'basic';
  defaultAuthConfig?: Record<string, any>;
}

// Interface for app action
export interface AppAction {
  id: string;
  name: string;
  description: string;
  inputs: AppNodeInput[];
  outputSchema: AppNodeOutputSchema;
  execute: (inputs: Record<string, any>, authConfig?: Record<string, any>) => Promise<any>;
}

// Registry of available apps
export class AppRegistry {
  private static apps: Record<string, AppDefinition> = {};

  static registerApp(app: AppDefinition): void {
    this.apps[app.id] = app;
  }

  static getApp(appId: string): AppDefinition | undefined {
    return this.apps[appId];
  }

  static getAllApps(): AppDefinition[] {
    return Object.values(this.apps);
  }

  static getAppsByCategory(category: string): AppDefinition[] {
    return Object.values(this.apps).filter(app => app.category === category);
  }
}
