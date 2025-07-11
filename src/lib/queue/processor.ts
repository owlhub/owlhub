import { prisma } from "@/src/lib/prisma";

// Define interfaces for the types used in the processor
interface Flow {
  id: string;
  name: string;
  isEnabled: boolean;
  config: string;
  parentFlowId?: string;
}


interface FlowStep {
  type: 'integration' | 'transform' | 'condition';
  integrationId?: string;
  transform?: string;
  condition?: string;
}

// Define a type for the payload/input data
type PayloadData = Record<string, unknown>;

/**
 * Process queue items
 * @param queueName The name of the queue to process (default: 'default')
 * @param batchSize The number of items to process in a batch (default: 10)
 * @returns The number of items processed
 */
export async function processQueue(queueName: string = 'default', batchSize: number = 10): Promise<number> {
  try {
    // Find the queue
    const queue = await prisma.queue.findUnique({
      where: { name: queueName }
    });

    if (!queue || !queue.isEnabled) {
      console.log(`Queue ${queueName} not found or disabled`);
      return 0;
    }

    // Get pending queue items
    const queueItems = await prisma.queueItem.findMany({
      where: {
        queueId: queue.id,
        status: 'pending'
      },
      include: {
        flow: true,
        flowRun: true
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: batchSize
    });

    if (queueItems.length === 0) {
      console.log(`No pending items in queue ${queueName}`);
      return 0;
    }

    console.log(`Processing ${queueItems.length} items from queue ${queueName}`);

    // Process each queue item
    const processPromises = queueItems.map(async (item) => {
      try {
        // Update item status to processing
        await prisma.queueItem.update({
          where: { id: item.id },
          data: { status: 'processing' }
        });

        // If there's a flow run, update its status
        if (item.flowRunId) {
          await prisma.flowRun.update({
            where: { id: item.flowRunId },
            data: { status: 'processing' }
          });
        }

        // Parse the payload
        const payload = JSON.parse(item.payload);

        // Execute the flow
        const result = await executeFlow(item.flow, payload);

        // Update the queue item status
        await prisma.queueItem.update({
          where: { id: item.id },
          data: { status: 'completed' }
        });

        // If there's a flow run, update it with the result
        if (item.flowRunId) {
          await prisma.flowRun.update({
            where: { id: item.flowRunId },
            data: {
              status: 'completed',
              output: JSON.stringify(result),
              endTime: new Date()
            }
          });
        }

        return { success: true, itemId: item.id };
      } catch (error) {
        console.error(`Error processing queue item ${item.id}:`, error);

        // Update the queue item status
        await prisma.queueItem.update({
          where: { id: item.id },
          data: {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });

        // If there's a flow run, update it with the error
        if (item.flowRunId) {
          await prisma.flowRun.update({
            where: { id: item.flowRunId },
            data: {
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
              endTime: new Date()
            }
          });
        }

        return { success: false, itemId: item.id, error };
      }
    });

    const results = await Promise.all(processPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`Processed ${successCount} of ${queueItems.length} items successfully from queue ${queueName}`);
    return successCount;
  } catch (error) {
    console.error(`Error processing queue ${queueName}:`, error);
    return 0;
  }
}

/**
 * Execute a flow with the given payload
 * @param flow The flow to execute
 * @param payload The payload to process
 * @returns The result of the flow execution
 */
async function executeFlow(flow: Flow, payload: PayloadData): Promise<PayloadData> {
  try {
    // Check if flow is enabled
    if (!flow.isEnabled) {
      throw new Error(`Flow ${flow.id} is disabled`);
    }

    // Parse the flow configuration
    const config = JSON.parse(flow.config);

    // Execute the flow based on the configuration
    let result = payload; // Start with the input payload

    // Process the flow configuration
    if (config.steps && Array.isArray(config.steps)) {
      for (const step of config.steps) {
        // Execute the step
        result = await executeFlowStep(step, result, flow);
      }
    }

    // Check if this flow has child webhooks
    if (flow.id) {
      const childFlows = await prisma.flow.findMany({
        where: {
          parentFlowId: flow.id,
          isEnabled: true
        }
      });

      // If there are child webhooks, create queue items for them
      if (childFlows.length > 0) {
        // Find or create a queue for each child flow
        for (const childFlow of childFlows) {
          // Create a flow run for the child flow
          const childFlowRun = await prisma.flowRun.create({
            data: {
              flowId: childFlow.id,
              status: 'pending',
              input: JSON.stringify(result)
            }
          });

          // Find or create a queue for the child flow
          const queueName = `flow-${childFlow.id}`;
          let queue = await prisma.queue.findFirst({
            where: { name: queueName }
          });

          if (!queue) {
            queue = await prisma.queue.create({
              data: {
                name: queueName,
                description: `Queue for flow ${childFlow.name}`
              }
            });
          }

          // Create a queue item for the child flow
          await prisma.queueItem.create({
            data: {
              queueId: queue.id,
              flowId: childFlow.id,
              flowRunId: childFlowRun.id,
              status: 'pending',
              payload: JSON.stringify(result)
            }
          });
        }
      }
    }

    return result;
  } catch (error) {
    console.error(`Error executing flow ${flow.id}:`, error);
    throw error;
  }
}

/**
 * Execute a flow step
 * @param step The step configuration
 * @param input The input data
 * @param flow The parent flow
 * @returns The result of the step execution
 */
async function executeFlowStep(step: FlowStep, input: PayloadData, flow: Flow): Promise<PayloadData> {
  try {
    // Check if step has a type
    if (!step.type) {
      throw new Error('Step type is required');
    }

    // Execute the step based on its type
    switch (step.type) {
      case 'integration':
        return await executeIntegrationStep(step, input);
      case 'transform':
        return executeTransformStep(step, input);
      case 'condition':
        return executeConditionStep(step, input);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  } catch (error) {
    console.error(`Error executing flow step:`, error);
    throw error;
  }
}

/**
 * Execute an integration step
 * @param step The step configuration
 * @param input The input data
 * @returns The result of the integration execution
 */
async function executeIntegrationStep(step: FlowStep, input: PayloadData): Promise<PayloadData> {
  try {
    // Check if step has an integration ID
    if (!step.integrationId) {
      throw new Error('Integration ID is required for integration step');
    }

    // Get the integration
    const integration = await prisma.integration.findUnique({
      where: { id: step.integrationId },
      include: {
        app: true
      }
    });

    if (!integration) {
      throw new Error(`Integration ${step.integrationId} not found`);
    }

    if (!integration.isEnabled) {
      throw new Error(`Integration ${step.integrationId} is disabled`);
    }

    // Parse the integration configuration
    const config = JSON.parse(integration.config);

    // Execute the integration based on the app type
    // This is a placeholder - in a real implementation, you would call the appropriate
    // integration handler based on the app type
    console.log(`Executing integration ${integration.name} (${integration.app.name})`);
    console.log(`Input:`, input);
    console.log(`Config:`, config);

    // For now, just return the input as the output
    // In a real implementation, you would call the integration and get a real result
    return {
      ...input,
      _integration: {
        id: integration.id,
        name: integration.name,
        app: integration.app.name
      }
    };
  } catch (error) {
    console.error(`Error executing integration step:`, error);
    throw error;
  }
}

/**
 * Execute a transform step
 * @param step The step configuration
 * @param input The input data
 * @returns The transformed data
 */
function executeTransformStep(step: FlowStep, input: PayloadData): PayloadData {
  try {
    // Check if step has a transform function
    if (!step.transform) {
      throw new Error('Transform function is required for transform step');
    }

    // For now, just return the input as the output
    // In a real implementation, you would apply the transformation
    return input;
  } catch (error) {
    console.error(`Error executing transform step:`, error);
    throw error;
  }
}

/**
 * Execute a condition step
 * @param step The step configuration
 * @param input The input data
 * @returns The result of the condition execution
 */
function executeConditionStep(step: FlowStep, input: PayloadData): PayloadData {
  try {
    // Check if step has a condition
    if (!step.condition) {
      throw new Error('Condition is required for condition step');
    }

    // For now, just return the input as the output
    // In a real implementation, you would evaluate the condition and execute the appropriate branch
    return input;
  } catch (error) {
    console.error(`Error executing condition step:`, error);
    throw error;
  }
}
