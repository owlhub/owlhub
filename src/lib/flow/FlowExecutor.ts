/**
 * FlowExecutor.ts
 * 
 * Handles the execution of flows, including data passing between nodes and error handling.
 */

import { Node, Edge } from '@xyflow/react';
import { AppRegistry, AppDefinition, AppAction } from './AppNodeInterface';

// Types for execution
export type NodeExecutionStatus = 'idle' | 'running' | 'success' | 'error';

export interface NodeExecutionState {
  nodeId: string;
  status: NodeExecutionStatus;
  startTime?: Date;
  endTime?: Date;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  error?: string;
}

export interface FlowExecutionState {
  flowId?: string;
  status: 'idle' | 'running' | 'completed' | 'error' | 'stopped';
  startTime?: Date;
  endTime?: Date;
  nodes: Record<string, NodeExecutionState>;
  currentNodeId?: string;
  error?: string;
}

export interface FlowExecutionOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  onNodeStatusChange?: (nodeId: string, status: NodeExecutionStatus) => void;
  onFlowStatusChange?: (status: FlowExecutionState['status']) => void;
  onComplete?: (result: FlowExecutionState) => void;
  onError?: (error: Error, state: FlowExecutionState) => void;
}

// Flow Executor class
export class FlowExecutor {
  private nodes: Node[];
  private edges: Edge[];
  private state: FlowExecutionState;
  private options: FlowExecutionOptions;
  private abortController: AbortController;

  constructor(nodes: Node[], edges: Edge[], options: FlowExecutionOptions = {}) {
    this.nodes = nodes;
    this.edges = edges;
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      ...options,
    };
    this.state = {
      status: 'idle',
      nodes: {},
    };
    this.abortController = new AbortController();

    // Initialize node execution states
    this.nodes.forEach(node => {
      this.state.nodes[node.id] = {
        nodeId: node.id,
        status: 'idle',
      };
    });
  }

  /**
   * Start the flow execution
   * @param startNodeId Optional node ID to start execution from (for resuming flows)
   */
  async execute(startNodeId?: string): Promise<FlowExecutionState> {
    try {
      // Reset state
      this.state = {
        status: 'running',
        startTime: new Date(),
        nodes: {},
      };

      // Initialize node execution states
      this.nodes.forEach(node => {
        this.state.nodes[node.id] = {
          nodeId: node.id,
          status: 'idle',
        };
      });

      // Notify flow status change
      this.options.onFlowStatusChange?.('running');

      if (startNodeId) {
        // Resume execution from the specified node
        const startNode = this.nodes.find(node => node.id === startNodeId);
        if (!startNode) {
          throw new Error(`Start node with ID ${startNodeId} not found`);
        }

        await this.executeNode(startNodeId);
      } else {
        // Start from trigger nodes (normal execution)
        const triggerNodes = this.findTriggerNodes();

        if (triggerNodes.length === 0) {
          throw new Error('No trigger nodes found in the flow');
        }

        // Execute trigger nodes
        for (const node of triggerNodes) {
          await this.executeNode(node.id);
        }
      }

      // Flow completed successfully
      this.state.status = 'completed';
      this.state.endTime = new Date();
      this.options.onFlowStatusChange?.('completed');
      this.options.onComplete?.(this.state);

      return this.state;
    } catch (error) {
      // Flow failed
      this.state.status = 'error';
      this.state.endTime = new Date();
      this.state.error = error.message;
      this.options.onFlowStatusChange?.('error');
      this.options.onError?.(error, this.state);

      return this.state;
    }
  }

  /**
   * Stop the flow execution
   */
  stop(): void {
    this.abortController.abort();
    this.state.status = 'stopped';
    this.state.endTime = new Date();
    this.options.onFlowStatusChange?.('stopped');
  }

  /**
   * Resume the flow execution from a specific node or from the last error point
   * @param nodeId Optional node ID to resume from. If not provided, will resume from the last error node
   * @param preserveState Whether to preserve the existing node states (default: true)
   */
  async resumeExecution(nodeId?: string, preserveState: boolean = true): Promise<FlowExecutionState> {
    // Save the current node states if we want to preserve them
    const previousNodeStates = preserveState ? { ...this.state.nodes } : {};

    // If no nodeId is provided, try to find the last error node
    if (!nodeId) {
      const errorNodes = Object.entries(this.state.nodes)
        .filter(([_, state]) => state.status === 'error')
        .map(([id, _]) => id);

      if (errorNodes.length === 0) {
        throw new Error('No error nodes found to resume from');
      }

      // Use the last error node as the starting point
      nodeId = errorNodes[errorNodes.length - 1];

      // Find the next nodes after the error node
      const errorNode = this.nodes.find(n => n.id === nodeId);
      if (!errorNode) {
        throw new Error(`Error node with ID ${nodeId} not found`);
      }

      const nextNodes = this.findNextNodes(nodeId);
      if (nextNodes.length > 0) {
        // Resume from the first node after the error node
        nodeId = nextNodes[0].id;
      } else {
        throw new Error(`No next nodes found after error node ${nodeId}`);
      }
    }

    // Create a new abort controller
    this.abortController = new AbortController();

    // Resume execution from the specified node
    const result = await this.execute(nodeId);

    // If we're preserving state, merge the previous successful node states with the new ones
    if (preserveState) {
      Object.entries(previousNodeStates).forEach(([id, state]) => {
        // Only keep successful states from previous execution
        if (state.status === 'success') {
          // If the node wasn't re-executed, restore its previous state
          if (!result.nodes[id] || result.nodes[id].status === 'idle') {
            result.nodes[id] = state;
          }
        }
      });
    }

    return result;
  }

  /**
   * Find nodes with no incoming edges (trigger nodes)
   */
  private findTriggerNodes(): Node[] {
    // Get all node IDs that are targets in edges
    const targetNodeIds = new Set(this.edges.map(edge => edge.target));

    // Find nodes that are not targets (i.e., have no incoming edges)
    return this.nodes.filter(node => !targetNodeIds.has(node.id));
  }

  /**
   * Find nodes that come after the given node
   */
  private findNextNodes(nodeId: string): Node[] {
    // Find all edges where the source is the given node
    const outgoingEdges = this.edges.filter(edge => edge.source === nodeId);

    // Get the target node IDs
    const targetNodeIds = outgoingEdges.map(edge => edge.target);

    // Find the nodes with those IDs
    return this.nodes.filter(node => targetNodeIds.includes(node.id));
  }

  /**
   * Execute a single node
   */
  private async executeNode(nodeId: string, inputData: Record<string, any> = {}): Promise<Record<string, any>> {
    // Get the node
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`Node with ID ${nodeId} not found`);
    }

    // Update node status
    this.updateNodeStatus(nodeId, 'running');
    this.state.currentNodeId = nodeId;

    try {
      // Get app and action
      const appId = node.data.appId;
      const actionId = node.data.actionId;

      if (!appId || !actionId) {
        throw new Error(`Node ${nodeId} is not properly configured`);
      }

      const app = AppRegistry.getApp(appId);
      if (!app) {
        throw new Error(`App ${appId} not found`);
      }

      const action = app.actions.find(a => a.id === actionId);
      if (!action) {
        throw new Error(`Action ${actionId} not found in app ${appId}`);
      }

      // Prepare inputs
      const nodeInputs = node.data.inputs || {};

      // Merge inputs from previous nodes with node's configured inputs
      const mergedInputs = { ...nodeInputs, ...inputData };

      // Store inputs in node state
      this.state.nodes[nodeId].inputs = mergedInputs;

      // Execute the action
      const result = await this.executeAction(app, action, mergedInputs, node.data.config);

      // Store outputs in node state
      this.state.nodes[nodeId].outputs = result;

      // Update node status
      this.updateNodeStatus(nodeId, 'success');

      // Execute next nodes
      const nextNodes = this.findNextNodes(nodeId);
      for (const nextNode of nextNodes) {
        // Check if this is a conditional edge
        const edge = this.edges.find(e => e.source === nodeId && e.target === nextNode.id);
        const sourceHandle = edge?.sourceHandle;

        // For conditional edges (true/false), only follow if condition matches
        if (sourceHandle === 'true' && !result.success) {
          continue;
        }
        if (sourceHandle === 'false' && result.success) {
          continue;
        }

        // Execute the next node with the current node's output as input
        await this.executeNode(nextNode.id, result);
      }

      return result;
    } catch (error) {
      // Update node status to error
      this.updateNodeStatus(nodeId, 'error', error.message);

      // Rethrow the error to be caught by the execute method
      throw error;
    }
  }

  /**
   * Execute an action with the given inputs
   */
  private async executeAction(
    app: AppDefinition, 
    action: AppAction, 
    inputs: Record<string, any>,
    config: Record<string, any> = {}
  ): Promise<Record<string, any>> {
    try {
      // Execute the action with a timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Action execution timed out after ${this.options.timeout}ms`)), this.options.timeout);
      });

      const actionPromise = action.execute(inputs, config.authConfig);

      // Race the action execution against the timeout
      const result = await Promise.race([actionPromise, timeoutPromise]);

      return result;
    } catch (error) {
      // Implement retry logic
      if (config.retries === undefined) {
        config.retries = 0;
      }

      if (config.retries < this.options.maxRetries) {
        // Increment retry count
        config.retries++;

        // Wait for retry delay
        await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));

        // Retry the action
        return this.executeAction(app, action, inputs, config);
      }

      // Max retries reached, throw the error
      throw error;
    }
  }

  /**
   * Update a node's execution status
   */
  private updateNodeStatus(nodeId: string, status: NodeExecutionStatus, error?: string): void {
    // Update the node state
    this.state.nodes[nodeId] = {
      ...this.state.nodes[nodeId],
      status,
      error,
    };

    // Set start/end time based on status
    if (status === 'running') {
      this.state.nodes[nodeId].startTime = new Date();
    } else if (status === 'success' || status === 'error') {
      this.state.nodes[nodeId].endTime = new Date();
    }

    // Notify status change
    this.options.onNodeStatusChange?.(nodeId, status);
  }

  /**
   * Get the current execution state
   */
  getState(): FlowExecutionState {
    return { ...this.state };
  }
}
