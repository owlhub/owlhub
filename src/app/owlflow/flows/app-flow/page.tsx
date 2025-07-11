"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Popup from "@/components/Popup";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
  MarkerType,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Import app flow components
import AppNode from '@/lib/flow/components/AppNode';
import AppNodeConfigPanel from '@/lib/flow/components/AppNodeConfigPanel';
import initializeAppRegistry from '@/lib/flow/AppRegistry';
import { AppRegistry, FlowTriggerType, FlowTriggerConfig, WebhookConfig, SchedulerConfig } from '@/lib/flow/AppNodeInterface';
import { FlowExecutor, FlowExecutionState, NodeExecutionStatus } from '@/lib/flow/FlowExecutor';

// Initialize the app registry
initializeAppRegistry();

// Define the types for the flow data
interface FlowData {
  name: string;
  description: string;
  isEnabled: boolean;
  nodes: Node[];
  edges: Edge[];
}

// Define node types
const nodeTypes = {
  appNode: AppNode,
};

// Define edge types
const edgeTypes = {
  // We'll use the default edge type for now
};

// Wrap the main component with ReactFlowProvider
export default function AppFlowPageWrapper() {
  return (
    <ReactFlowProvider>
      <AppFlowPage />
    </ReactFlowProvider>
  );
}

function AppFlowPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated: () => router.push('/?redirect=/owlflow/flows/app-flow'),
  });

  // Basic flow information
  const [flowInfo, setFlowInfo] = useState({
    name: '',
    description: '',
    isEnabled: true,
    triggerConfig: {
      type: 'manual' as FlowTriggerType,
      webhook: {
        path: '',
        secret: '',
        description: '',
      },
      scheduler: {
        frequency: 'daily' as const,
        interval: 1,
        time: '00:00',
      },
    },
  });

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Get the React Flow instance
  const reactFlowInstance = useReactFlow();

  // History state for undo/redo
  const [history, setHistory] = useState<{
    past: { nodes: Node[]; edges: Edge[] }[];
    future: { nodes: Node[]; edges: Edge[] }[];
  }>({
    past: [],
    future: [],
  });

  // UI states
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showNodePanel, setShowNodePanel] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [isValidConnection, setIsValidConnection] = useState<boolean>(true);
  // Initialize canvas height based on viewport height
  // State for canvas height and slider min/max values
  const [canvasHeight, setCanvasHeight] = useState<number>(() => {
    // Default to 800px if window is not available (SSR)
    if (typeof window === 'undefined') return 800;

    // Calculate height based on viewport height, leaving space for other UI elements
    // Subtract approximately 300px for headers, footers, and other UI elements
    return Math.max(400, window.innerHeight - 300);
  });
  const [sliderMin, setSliderMin] = useState<number>(400);
  const [sliderMax, setSliderMax] = useState<number>(1200);
  const [appCategories, setAppCategories] = useState<string[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [showAppSidebar, setShowAppSidebar] = useState(false); // State for the right app sidebar

  // We've removed the Add Node Popup states as we're now using a sidebar

  // Execution states
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionState, setExecutionState] = useState<FlowExecutionState | null>(null);
  const [flowExecutor, setFlowExecutor] = useState<FlowExecutor | null>(null);

  // Reference to the React Flow instance
  const xyflowWrapper = useRef(null);

  // Generate a unique ID for new nodes and edges
  const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Load available apps
  useEffect(() => {
    const allApps = AppRegistry.getAllApps();
    setApps(allApps);

    // Extract unique categories
    const categories = Array.from(new Set(allApps.map(app => app.category)));
    setAppCategories(categories);
  }, []);

  // Update canvas height and slider values when window is resized
  useEffect(() => {
    // Initialize slider min/max values based on viewport height
    if (typeof window !== 'undefined') {
      setSliderMin(Math.max(400, window.innerHeight - 500));
      setSliderMax(Math.max(800, window.innerHeight - 100));
    }

    const handleResize = () => {
      // Calculate height based on viewport height, leaving space for other UI elements
      const newHeight = Math.max(400, window.innerHeight - 300);
      setCanvasHeight(newHeight);

      // Update slider min/max values
      setSliderMin(Math.max(400, window.innerHeight - 500));
      setSliderMax(Math.max(800, window.innerHeight - 100));
    };

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Undo function
  const handleUndo = useCallback(() => {
    if (history.past.length === 0) return;

    const newPast = [...history.past];
    const previous = newPast.pop();

    setHistory({
      past: newPast,
      future: [{ nodes, edges }, ...history.future],
    });

    if (previous) {
      setNodes(previous.nodes);
      setEdges(previous.edges);
    }
  }, [history, nodes, edges, setNodes, setEdges]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (history.future.length === 0) return;

    const newFuture = [...history.future];
    const next = newFuture.shift();

    setHistory({
      past: [...history.past, { nodes, edges }],
      future: newFuture,
    });

    if (next) {
      setNodes(next.nodes);
      setEdges(next.edges);
    }
  }, [history, nodes, edges, setNodes, setEdges]);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    setHistory(prev => ({
      past: [...prev.past, { nodes, edges }],
      future: [],
    }));
  }, [nodes, edges]);

  // Custom node changes handler that updates history
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Only save to history for certain types of changes
    const significantChanges = changes.filter(
      change => change.type === 'remove' || change.type === 'add' || 
      (change.type === 'position' && (change as any).dragging === false)
    );

    if (significantChanges.length > 0) {
      saveToHistory();
    }

    onNodesChange(changes);
  }, [onNodesChange, saveToHistory]);

  // Custom edge changes handler that updates history
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (changes.some(change => change.type === 'remove' || change.type === 'add')) {
      saveToHistory();
    }

    onEdgesChange(changes);
  }, [onEdgesChange, saveToHistory]);

  // Handle node drag and drop
  const [dragOverPosition, setDragOverPosition] = useState<{ x: number, y: number } | null>(null);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    // Update the drag over position for visual feedback
    if (xyflowWrapper.current) {
      const xyflowBounds = xyflowWrapper.current.getBoundingClientRect();
      setDragOverPosition({
        x: event.clientX - xyflowBounds.left,
        y: event.clientY - xyflowBounds.top
      });
    }
  }, []);

  const onDragLeave = useCallback(() => {
    setDragOverPosition(null);
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOverPosition(null);

    // Get the app ID from the dragged element
    const appId = event.dataTransfer.getData('application/app-id');

    if (!appId || !xyflowWrapper.current) {
      return;
    }

    // Save current state to history before adding a new node
    saveToHistory();

    // Get the position where the node was dropped
    const xyflowBounds = xyflowWrapper.current.getBoundingClientRect();
    const position = {
      x: event.clientX - xyflowBounds.left,
      y: event.clientY - xyflowBounds.top
    };

    // Get the app from the registry
    const app = AppRegistry.getApp(appId);
    if (!app) {
      console.error(`App with ID ${appId} not found`);
      return;
    }

    // Create a new node
    const newNode = {
      id: generateId('node'),
      type: 'appNode',
      position,
      data: {
        appId: app.id,
        appName: app.name,
        nodeName: app.name, // Initialize node name with app name
        actionId: '',
        actionName: '',
        config: {
          authType: app.defaultAuthType || 'none',
          authConfig: app.defaultAuthConfig || {},
        },
        inputs: {},
        status: 'idle' as NodeExecutionStatus,
      }
    };

    // Add the new node to the React Flow state
    setNodes((nds) => nds.concat(newNode));

    // Select the new node for editing
    setSelectedNode(newNode);
    setShowNodePanel(true);

    // Close the app sidebar after dropping
    setShowAppSidebar(false);
  }, [saveToHistory, setNodes]);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNode(node);
    setShowNodePanel(true);
  }, []);

  // We've removed the popup-related functions as we're now using a sidebar

  // Validate connection
  const isValidConnectionFunc = useCallback((connection: Connection) => {
    // Get source and target nodes
    const sourceNode = nodes.find(node => node.id === connection.source);
    const targetNode = nodes.find(node => node.id === connection.target);

    if (!sourceNode || !targetNode) return false;

    // Prevent self-connections
    if (connection.source === connection.target) {
      setIsValidConnection(false);
      setTimeout(() => setIsValidConnection(true), 500); // Reset after 500ms
      return false;
    }

    // Check for circular references (simplified)
    const existingEdges = edges.filter(edge => edge.target === connection.source);
    if (existingEdges.some(edge => edge.source === connection.target)) {
      setIsValidConnection(false);
      setTimeout(() => setIsValidConnection(true), 500); // Reset after 500ms
      return false;
    }

    return true;
  }, [nodes, edges]);

  // Handle edge creation
  const onConnect = useCallback((params: Connection) => {
    if (!isValidConnectionFunc(params)) return;

    // Save current state to history before adding a new edge
    saveToHistory();

    const newEdge = {
      id: generateId('edge'),
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
    };

    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges, saveToHistory, isValidConnectionFunc]);

  // Update node data
  const updateNodeData = useCallback((nodeId: string, updates: Record<string, any>) => {
    // Save current state to history before updating node data
    saveToHistory();

    setNodes((nds) => 
      nds.map((node) => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...updates } } 
          : node
      )
    );
  }, [setNodes, saveToHistory]);

  // Delete node
  const deleteNode = useCallback((nodeId: string, newAppId?: string) => {
    // Save current state to history before deleting a node
    saveToHistory();

    // If newAppId is provided, we need to create a new node with the new app type
    if (newAppId) {
      // Get the node to be deleted to get its position
      const nodeToDelete = nodes.find(node => node.id === nodeId);

      if (nodeToDelete) {
        // Get the position of the node to be deleted
        const position = { ...nodeToDelete.position };

        // Delete the node
        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
        setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
        setSelectedNode(null);
        setShowNodePanel(false);

        // Get the app from the registry
        const app = AppRegistry.getApp(newAppId);
        if (app) {
          // Create a new node with the new app type
          const newNode = {
            id: generateId('node'),
            type: 'appNode',
            position,
            data: {
              appId: app.id,
              appName: app.name,
              nodeName: app.name, // Initialize node name with app name
              actionId: '',
              actionName: '',
              config: {
                authType: app.defaultAuthType || 'none',
                authConfig: app.defaultAuthConfig || {},
              },
              inputs: {},
              status: 'idle' as NodeExecutionStatus,
            }
          };

          // Add the new node to the React Flow state
          setNodes((nds) => nds.concat(newNode));

          // Select the new node for editing
          setSelectedNode(newNode);
          setShowNodePanel(true);
        }
      } else {
        // If the node to be deleted is not found, just delete the node
        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
        setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
        setSelectedNode(null);
        setShowNodePanel(false);
      }
    } else {
      // If newAppId is not provided, just delete the node
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      setSelectedNode(null);
      setShowNodePanel(false);
    }
  }, [nodes, setNodes, setEdges, saveToHistory]);

  // Handle form field changes
  const handleChange = (field: keyof typeof flowInfo, value: any) => {
    setFlowInfo({ ...flowInfo, [field]: value });
  };

  // Execute the flow
  const executeFlow = useCallback(() => {
    if (isExecuting) return;

    setIsExecuting(true);
    setError(null);

    // Reset node statuses
    setNodes(nds => 
      nds.map(node => ({
        ...node,
        data: { ...node.data, status: 'idle' as NodeExecutionStatus, error: undefined }
      }))
    );

    // Create a new flow executor
    const executor = new FlowExecutor(nodes, edges, {
      onNodeStatusChange: (nodeId, status) => {
        // Update node status in the UI
        setNodes(nds => 
          nds.map(node => 
            node.id === nodeId 
              ? { ...node, data: { ...node.data, status, isActive: status === 'running' } } 
              : node
          )
        );
      },
      onFlowStatusChange: (status) => {
        if (status !== 'running') {
          setIsExecuting(false);
        }
      },
      onComplete: (result) => {
        setExecutionState(result);
        setIsExecuting(false);
      },
      onError: (error, state) => {
        setError(error.message);
        setExecutionState(state);
        setIsExecuting(false);
      }
    });

    setFlowExecutor(executor);

    // Execute the flow
    executor.execute().catch(error => {
      setError(error.message);
      setIsExecuting(false);
    });
  }, [nodes, edges, isExecuting, setNodes]);

  // Stop flow execution
  const stopExecution = useCallback(() => {
    if (flowExecutor) {
      flowExecutor.stop();
      setIsExecuting(false);
    }
  }, [flowExecutor]);

  // Resume flow execution from where it left off
  const resumeExecution = useCallback(() => {
    if (!flowExecutor) return;

    setIsExecuting(true);
    setError(null);

    // Resume the flow execution
    flowExecutor.resumeExecution()
      .then(result => {
        setExecutionState(result);
        setIsExecuting(false);

        // Update node statuses in the UI based on the execution result
        setNodes(nds => 
          nds.map(node => {
            const nodeState = result.nodes[node.id];
            if (nodeState) {
              return {
                ...node,
                data: { 
                  ...node.data, 
                  status: nodeState.status,
                  isActive: nodeState.status === 'running',
                  error: nodeState.error
                }
              };
            }
            return node;
          })
        );
      })
      .catch(error => {
        setError(error.message);
        setIsExecuting(false);
      });
  }, [flowExecutor, setNodes]);

  // Validate flow before submission
  const validateFlow = (): string | null => {
    // Check for basic requirements
    if (!flowInfo.name.trim()) {
      return "Flow name is required";
    }

    if (nodes.length === 0) {
      return "At least one node is required";
    }

    // Check for disconnected nodes
    const connectedNodeIds = new Set<string>();

    // Add all target nodes from edges
    edges.forEach(edge => {
      connectedNodeIds.add(edge.target);
    });

    // Find trigger nodes (nodes with no incoming edges)
    const triggerNodes = nodes.filter(node => !connectedNodeIds.has(node.id));

    if (triggerNodes.length === 0) {
      return "At least one trigger node (node with no incoming connections) is required";
    }

    // Check for nodes that aren't properly configured
    const unconfiguredNodes = nodes.filter(node => {
      if (!node.data.appId || !node.data.actionId) {
        return true;
      }
      return false;
    });

    if (unconfiguredNodes.length > 0) {
      return `${unconfiguredNodes.length} node(s) are not fully configured`;
    }

    // Validate trigger configuration
    if (flowInfo.triggerConfig.type === 'webhook') {
      // Webhook path is required
      if (!flowInfo.triggerConfig.webhook.path.trim()) {
        return "Webhook path is required";
      }

      // Webhook path should be URL-friendly
      const pathRegex = /^[a-zA-Z0-9-_]+$/;
      if (!pathRegex.test(flowInfo.triggerConfig.webhook.path)) {
        return "Webhook path should only contain letters, numbers, hyphens, and underscores";
      }
    } else if (flowInfo.triggerConfig.type === 'scheduler') {
      // Validate scheduler configuration based on frequency
      const { frequency, interval, time, dayOfWeek, dayOfMonth } = flowInfo.triggerConfig.scheduler;

      if (frequency === 'minutely' || frequency === 'hourly') {
        // Interval is required and should be a positive number
        if (!interval || interval < 1) {
          return `Interval must be at least 1 ${frequency === 'minutely' ? 'minute' : 'hour'}`;
        }

        // Validate max interval
        if (frequency === 'minutely' && interval > 59) {
          return "Interval must be at most 59 minutes";
        }
        if (frequency === 'hourly' && interval > 23) {
          return "Interval must be at most 23 hours";
        }
      } else if (frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly') {
        // Time is required for daily, weekly, and monthly frequencies
        if (!time) {
          return "Time is required for daily, weekly, and monthly schedules";
        }

        // Validate time format (HH:MM)
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(time)) {
          return "Time must be in HH:MM format";
        }

        // Day of week is required for weekly frequency
        if (frequency === 'weekly' && (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6)) {
          return "Day of week is required for weekly schedules";
        }

        // Day of month is required for monthly frequency
        if (frequency === 'monthly' && (dayOfMonth === undefined || dayOfMonth < 1 || dayOfMonth > 31)) {
          return "Day of month is required for monthly schedules";
        }
      }
    }

    return null;
  };

  // Handle form submission
  const handleSubmit = async () => {
    const validationError = validateFlow();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Convert the flow data to the format expected by the API
      const submitData = {
        name: flowInfo.name,
        description: flowInfo.description,
        isEnabled: flowInfo.isEnabled,
        triggerConfig: flowInfo.triggerConfig,
        config: {
          nodes,
          edges,
          flowType: 'app-flow',
          metadata: {
            isAppFlow: true
          }
        }
      };

      // API call to create flow
      const response = await fetch('/api/flows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create flow');
      }

      const data = await response.json();

      // Redirect to the flow details page
      router.push(`/owlflow/flows/${data.flow.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while creating the flow');
      console.error('Error creating flow:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if not in an input field
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      // Undo: Ctrl/Cmd + Z
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();
        handleUndo();
      }

      // Redo: Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z
      if ((event.ctrlKey || event.metaKey) && event.key === 'y' ||
          (event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') {
        event.preventDefault();
        handleRedo();
      }

      // Delete selected node: Delete or Backspace
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode) {
        event.preventDefault();
        deleteNode(selectedNode.id);
      }

      // Close node panel: Escape
      if (event.key === 'Escape' && showNodePanel) {
        event.preventDefault();
        setShowNodePanel(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo, deleteNode, selectedNode, showNodePanel]);

  if (status === "loading") {
    return <></>;
  }

  if (!session?.user?.isSuperUser) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Cancel Confirmation Modal */}
      <Popup
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title="Discard Changes"
        buttons={[
          {
            label: "Continue Editing",
            onClick: () => setShowCancelConfirm(false),
            variant: "secondary"
          },
          {
            label: "Discard Changes",
            onClick: () => router.push('/owlflow/flows'),
            variant: "danger"
          }
        ]}
      >
        <p>
          Are you sure you want to discard your changes? All unsaved changes will be lost.
        </p>
      </Popup>

      {/* We've removed the Add Node Popup as we're now using a sidebar */}

      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create Flow (App Flow Editor)</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-3 py-1 rounded-md text-white"
            style={{ background: 'var(--primary-blue)', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Creating...' : 'Create Flow'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow p-6 mb-6" style={{ borderColor: 'var(--border-color)' }}>
        <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              value={flowInfo.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full p-2 border rounded-md border-gray-300"
              placeholder="Enter flow name"
              disabled={submitting}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={flowInfo.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Enter flow description"
              rows={1}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Enabled Status */}
        <div className="mt-4 flex items-center">
          <label htmlFor="isEnabled" className="block text-sm font-medium mr-2">
            Enabled
          </label>
          <button
            type="button"
            onClick={() => handleChange('isEnabled', !flowInfo.isEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              flowInfo.isEnabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={flowInfo.isEnabled}
            id="isEnabled"
            disabled={submitting}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                flowInfo.isEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Trigger Configuration */}
        <div className="mt-6">
          <h3 className="text-md font-medium mb-3">Trigger Configuration</h3>

          {/* Trigger Type Selector */}
          <div className="mb-4">
            <label htmlFor="triggerType" className="block text-sm font-medium mb-1">
              Trigger Type
            </label>
            <select
              id="triggerType"
              value={flowInfo.triggerConfig.type}
              onChange={(e) => handleChange('triggerConfig', {
                ...flowInfo.triggerConfig,
                type: e.target.value as FlowTriggerType
              })}
              className="w-full p-2 border rounded-md border-gray-300"
              disabled={submitting}
            >
              <option value="manual">Manual (Triggered by user)</option>
              <option value="webhook">Webhook (Triggered by HTTP request)</option>
              <option value="scheduler">Scheduler (Triggered on schedule)</option>
            </select>
          </div>

          {/* Webhook Configuration */}
          {flowInfo.triggerConfig.type === 'webhook' && (
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-4">
              <h4 className="text-sm font-medium mb-2">Webhook Configuration</h4>

              <div className="mb-3">
                <label htmlFor="webhookPath" className="block text-sm font-medium mb-1">
                  Webhook Path *
                </label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">/api/webhooks/</span>
                  <input
                    type="text"
                    id="webhookPath"
                    value={flowInfo.triggerConfig.webhook.path}
                    onChange={(e) => handleChange('triggerConfig', {
                      ...flowInfo.triggerConfig,
                      webhook: {
                        ...flowInfo.triggerConfig.webhook,
                        path: e.target.value
                      }
                    })}
                    className="flex-1 p-2 border rounded-md border-gray-300"
                    placeholder="your-webhook-path"
                    disabled={submitting}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This will be the URL path for your webhook: /api/webhooks/your-webhook-path
                </p>
              </div>

              <div className="mb-3">
                <label htmlFor="webhookSecret" className="block text-sm font-medium mb-1">
                  Secret Token
                </label>
                <input
                  type="text"
                  id="webhookSecret"
                  value={flowInfo.triggerConfig.webhook.secret}
                  onChange={(e) => handleChange('triggerConfig', {
                    ...flowInfo.triggerConfig,
                    webhook: {
                      ...flowInfo.triggerConfig.webhook,
                      secret: e.target.value
                    }
                  })}
                  className="w-full p-2 border rounded-md border-gray-300"
                  placeholder="Secret token for webhook validation"
                  disabled={submitting}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used to validate incoming webhook requests. Leave empty for no validation.
                </p>
              </div>

              <div>
                <label htmlFor="webhookDescription" className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  id="webhookDescription"
                  value={flowInfo.triggerConfig.webhook.description}
                  onChange={(e) => handleChange('triggerConfig', {
                    ...flowInfo.triggerConfig,
                    webhook: {
                      ...flowInfo.triggerConfig.webhook,
                      description: e.target.value
                    }
                  })}
                  className="w-full p-2 border rounded-md border-gray-300"
                  placeholder="Description of this webhook"
                  rows={2}
                  disabled={submitting}
                />
              </div>
            </div>
          )}

          {/* Scheduler Configuration */}
          {flowInfo.triggerConfig.type === 'scheduler' && (
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-4">
              <h4 className="text-sm font-medium mb-2">Scheduler Configuration</h4>

              <div className="mb-3">
                <label htmlFor="frequency" className="block text-sm font-medium mb-1">
                  Frequency
                </label>
                <select
                  id="frequency"
                  value={flowInfo.triggerConfig.scheduler.frequency}
                  onChange={(e) => handleChange('triggerConfig', {
                    ...flowInfo.triggerConfig,
                    scheduler: {
                      ...flowInfo.triggerConfig.scheduler,
                      frequency: e.target.value as SchedulerConfig['frequency']
                    }
                  })}
                  className="w-full p-2 border rounded-md border-gray-300"
                  disabled={submitting}
                >
                  <option value="minutely">Minutely</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {/* Interval (for minutely/hourly) */}
              {(flowInfo.triggerConfig.scheduler.frequency === 'minutely' || 
                flowInfo.triggerConfig.scheduler.frequency === 'hourly') && (
                <div className="mb-3">
                  <label htmlFor="interval" className="block text-sm font-medium mb-1">
                    Every
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      id="interval"
                      min="1"
                      max={flowInfo.triggerConfig.scheduler.frequency === 'minutely' ? 59 : 23}
                      value={flowInfo.triggerConfig.scheduler.interval}
                      onChange={(e) => handleChange('triggerConfig', {
                        ...flowInfo.triggerConfig,
                        scheduler: {
                          ...flowInfo.triggerConfig.scheduler,
                          interval: parseInt(e.target.value) || 1
                        }
                      })}
                      className="w-20 p-2 border rounded-md border-gray-300"
                      disabled={submitting}
                    />
                    <span className="ml-2">
                      {flowInfo.triggerConfig.scheduler.frequency === 'minutely' ? 'minute(s)' : 'hour(s)'}
                    </span>
                  </div>
                </div>
              )}

              {/* Day of Week (for weekly) */}
              {flowInfo.triggerConfig.scheduler.frequency === 'weekly' && (
                <div className="mb-3">
                  <label htmlFor="dayOfWeek" className="block text-sm font-medium mb-1">
                    Day of Week
                  </label>
                  <select
                    id="dayOfWeek"
                    value={flowInfo.triggerConfig.scheduler.dayOfWeek || 0}
                    onChange={(e) => handleChange('triggerConfig', {
                      ...flowInfo.triggerConfig,
                      scheduler: {
                        ...flowInfo.triggerConfig.scheduler,
                        dayOfWeek: parseInt(e.target.value)
                      }
                    })}
                    className="w-full p-2 border rounded-md border-gray-300"
                    disabled={submitting}
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
              )}

              {/* Day of Month (for monthly) */}
              {flowInfo.triggerConfig.scheduler.frequency === 'monthly' && (
                <div className="mb-3">
                  <label htmlFor="dayOfMonth" className="block text-sm font-medium mb-1">
                    Day of Month
                  </label>
                  <select
                    id="dayOfMonth"
                    value={flowInfo.triggerConfig.scheduler.dayOfMonth || 1}
                    onChange={(e) => handleChange('triggerConfig', {
                      ...flowInfo.triggerConfig,
                      scheduler: {
                        ...flowInfo.triggerConfig.scheduler,
                        dayOfMonth: parseInt(e.target.value)
                      }
                    })}
                    className="w-full p-2 border rounded-md border-gray-300"
                    disabled={submitting}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Time (for daily, weekly, monthly) */}
              {(flowInfo.triggerConfig.scheduler.frequency === 'daily' || 
                flowInfo.triggerConfig.scheduler.frequency === 'weekly' || 
                flowInfo.triggerConfig.scheduler.frequency === 'monthly') && (
                <div className="mb-3">
                  <label htmlFor="time" className="block text-sm font-medium mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    id="time"
                    value={flowInfo.triggerConfig.scheduler.time}
                    onChange={(e) => handleChange('triggerConfig', {
                      ...flowInfo.triggerConfig,
                      scheduler: {
                        ...flowInfo.triggerConfig.scheduler,
                        time: e.target.value
                      }
                    })}
                    className="w-full p-2 border rounded-md border-gray-300"
                    disabled={submitting}
                  />
                </div>
              )}
            </div>
          )}

          {/* Manual Trigger Info */}
          {flowInfo.triggerConfig.type === 'manual' && (
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-4">
              <p className="text-sm text-gray-600">
                This flow will be triggered manually by clicking the "Execute Flow" button.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Flow Editor */}
      <div className="bg-white rounded-lg shadow p-6" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Flow Editor</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Canvas Height:</span>
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step="50"
              value={canvasHeight}
              onChange={(e) => setCanvasHeight(parseInt(e.target.value))}
              className="w-32"
            />
            <span className="text-sm text-gray-500">{canvasHeight}px</span>
            <span className="text-xs text-blue-500">(Auto-adjusted to viewport)</span>
          </div>
        </div>

        <div className="flex" style={{ height: `${canvasHeight}px` }}>

          {/* Canvas Area */}
          <div 
            className="flex-1 border border-gray-200 bg-gray-50 relative"
            ref={xyflowWrapper}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <p>Drag and drop apps from the palette to create your flow</p>
                  <p className="text-sm mt-2">Connect nodes by dragging from one node's output to another node's input</p>
                </div>
              </div>
            )}

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
              connectionLineStyle={{
                stroke: isValidConnection ? '#3b82f6' : '#ff0072',
                strokeWidth: 2,
                strokeDasharray: '5 5',
              }}
              isValidConnection={isValidConnectionFunc}
              defaultEdgeOptions={{
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                },
                style: { strokeWidth: 2 }
              }}
            >
              {/* Drag placeholder for visual feedback */}
              {dragOverPosition && (
                <div 
                  style={{
                    position: 'absolute',
                    left: dragOverPosition.x - 90, // Center the placeholder
                    top: dragOverPosition.y - 40,
                    width: 180,
                    height: 80,
                    borderRadius: '6px',
                    border: '2px dashed #3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    pointerEvents: 'none',
                    zIndex: 1000,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <div className="text-blue-500 text-sm font-medium">Drop to add app</div>
                </div>
              )}
              <Controls />
              <Background color="#aaa" gap={16} />
              <MiniMap />
              <Panel position="top-right" className="flex flex-col gap-2">
                <div className="flex gap-1">
                  <button
                    onClick={handleUndo}
                    disabled={history.past.length === 0 || isExecuting}
                    className="px-2 py-1 text-sm rounded-md text-white bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Undo"
                  >
                    ↩ Undo
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={history.future.length === 0 || isExecuting}
                    className="px-2 py-1 text-sm rounded-md text-white bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Redo"
                  >
                    Redo ↪
                  </button>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowAppSidebar(true)}
                    className="px-2 py-1 text-sm rounded-md text-white bg-blue-500 hover:bg-blue-600"
                    title="Add Node"
                  >
                    + Add Node
                  </button>
                </div>
                <div className="flex gap-1">
                  {isExecuting ? (
                    <button
                      onClick={stopExecution}
                      className="px-2 py-1 text-sm rounded-md text-white bg-red-500 hover:bg-red-600"
                    >
                      Stop Execution
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={executeFlow}
                        disabled={nodes.length === 0}
                        className="px-2 py-1 text-sm rounded-md text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Execute Flow
                      </button>
                      {executionState && executionState.status === 'error' && (
                        <button
                          onClick={resumeExecution}
                          className="px-2 py-1 text-sm rounded-md text-white bg-blue-500 hover:bg-blue-600"
                        >
                          Resume Flow
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Panel>
            </ReactFlow>
          </div>

          {/* Node Configuration Panel */}
          {showNodePanel && selectedNode && (
            <div className="w-80 border-l border-gray-200 overflow-y-auto">
              <AppNodeConfigPanel
                nodeId={selectedNode.id}
                data={selectedNode.data}
                onUpdate={updateNodeData}
                onClose={() => {
                  setShowNodePanel(false);
                  setSelectedNode(null);
                }}
                onDeleteNode={deleteNode}
              />

              {/* Delete Node Button */}
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => deleteNode(selectedNode.id)}
                  className="w-full p-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                >
                  Delete Node
                </button>
              </div>
            </div>
          )}

          {/* App Selection Sidebar */}
          {showAppSidebar && (
            <div className="w-80 border-l border-gray-200 overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Add Node</h3>
                <button 
                  onClick={() => setShowAppSidebar(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="p-3">
                <h3 className="text-sm font-medium mb-3 flex justify-between items-center">
                  <span>Available Apps</span>
                  <span className="text-xs text-blue-500">(Drag & Drop)</span>
                </h3>

                {/* Group apps by category */}
                {appCategories.map(category => (
                  <div key={category} className="mb-4">
                    <h4 className="text-xs uppercase text-gray-500 mb-2">{category}</h4>
                    <div className="space-y-2">
                      {apps
                        .filter(app => app.category === category)
                        .map(app => (
                          <div
                            key={app.id}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData('application/app-id', app.id);
                              event.dataTransfer.effectAllowed = 'move';
                            }}
                            className="p-2 bg-blue-50 border border-blue-200 rounded cursor-move hover:bg-blue-100 flex items-center"
                          >
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center mr-2"
                              style={{ backgroundColor: app.color || '#6b7280' }}
                            >
                              <span className="text-white text-xs">{app.icon || 'A'}</span>
                            </div>
                            <div>
                              <div className="font-medium">{app.name}</div>
                              <div className="text-xs text-gray-500">{app.description}</div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>Tip: Click the "+ Add Node" button to open the app sidebar, then drag apps onto the canvas and connect them by dragging from one node's handle to another.</p>
        </div>
      </div>
    </div>
  );
}
