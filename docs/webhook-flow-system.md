# Webhook and Flow System

This document provides an overview of the webhook and flow system implemented in the application. The system allows for the creation of webhooks that can trigger flows, which can then process data and pass it to other flows or integrations.

## System Components

### Webhooks

Webhooks are endpoints that can receive HTTP requests from external systems. Each webhook has a unique token that is used to authenticate requests. When a webhook receives a request, it creates a webhook event and triggers any associated flows.

### Flows

Flows are sequences of steps that process data. Each flow can be associated with a webhook or a parent flow. Flows can have child flows, allowing for nested processing. Each flow has a configuration that defines the steps to be executed.

### Queues

Queues are used to manage the processing of flows. When a webhook receives a request, it creates queue items for each associated flow. These queue items are then processed asynchronously by a background job.

## Database Models

The following database models are used to implement the webhook and flow system:

- `Webhook`: Stores webhook configurations
- `WebhookEvent`: Tracks webhook events
- `Flow`: Defines integration flows, with support for nested flows
- `FlowRun`: Tracks flow executions
- `Queue`: Defines message queues
- `QueueItem`: Tracks items in queues

## API Endpoints

### Webhooks

- `GET /api/webhooks`: Fetch all webhooks (admin only)
- `POST /api/webhooks`: Create a new webhook (admin only)
- `GET /api/webhooks/:id`: Fetch a specific webhook by ID (admin only)
- `PATCH /api/webhooks/:id`: Update a webhook (admin only)
- `DELETE /api/webhooks/:id`: Delete a webhook (admin only)
- `POST /api/webhooks/receive/:token`: Receive webhook events from external systems
- `GET /api/webhooks/receive/:token`: Verify that a webhook is active (for testing)

### Flows

- `GET /api/flows`: Fetch all flows (admin only)
- `POST /api/flows`: Create a new flow (admin only)
- `GET /api/flows/:id`: Fetch a specific flow by ID (admin only)
- `PATCH /api/flows/:id`: Update a flow (admin only)
- `DELETE /api/flows/:id`: Delete a flow (admin only)

## Flow Configuration

Flows are configured using a JSON object that defines the steps to be executed. Each step has a type and additional configuration specific to that type. The following step types are supported:

### Integration Step

Executes an integration with the given configuration.

```json
{
  "type": "integration",
  "integrationId": "integration-id",
  "config": {
    // Integration-specific configuration
  }
}
```

### Transform Step

Transforms the data using a specified transformation function.

```json
{
  "type": "transform",
  "transform": "transformation-function"
}
```

### Condition Step

Evaluates a condition and executes different branches based on the result.

```json
{
  "type": "condition",
  "condition": "condition-expression",
  "ifTrue": [
    // Steps to execute if condition is true
  ],
  "ifFalse": [
    // Steps to execute if condition is false
  ]
}
```

## Queue Processing

Queue processing is handled by a background job that runs periodically. The job processes pending queue items and executes the associated flows. The job is implemented in the `scripts/queue/processQueues.ts` file.

To run the queue processing job manually:

```bash
npx ts-node scripts/queue/processQueues.ts
```

## Example: GitLab Webhook to Jira Integration

Here's an example of how to set up a webhook that receives events from GitLab and creates issues in Jira:

1. Create a webhook:
   ```
   POST /api/webhooks
   {
     "name": "GitLab Webhook",
     "description": "Receives events from GitLab"
   }
   ```

2. Create a flow:
   ```
   POST /api/flows
   {
     "name": "GitLab to Jira",
     "description": "Creates Jira issues from GitLab events",
     "webhookId": "webhook-id",
     "config": {
       "steps": [
         {
           "type": "condition",
           "condition": "payload.object_kind === 'issue'",
           "ifTrue": [
             {
               "type": "integration",
               "integrationId": "jira-integration-id",
               "config": {
                 "action": "createIssue",
                 "project": "PROJECT",
                 "issueType": "Bug",
                 "summary": "payload.object_attributes.title",
                 "description": "payload.object_attributes.description"
               }
             }
           ]
         }
       ]
     }
   }
   ```

3. Use the webhook URL in GitLab:
   ```
   https://your-app.com/api/webhooks/receive/webhook-token
   ```

## Security Considerations

- Webhook tokens are used to authenticate requests from external systems.
- Only superusers can manage webhooks and flows.
- Webhook events and flow runs are tracked for auditing purposes.
- Queue processing is done asynchronously to prevent blocking the main application.