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
  NodeTypes,
  Handle,
  Position,
  useReactFlow,
  EdgeProps,
  getBezierPath,
  NodeResizer
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Define the types for the flow data using @xyflow/react types
interface FlowData {
  name: string;
  description: string;
  isEnabled: boolean;
  nodes: Node[];
  edges: Edge[];
}

// Custom edge component
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  sourceHandleId,
  markerEnd,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine edge color and label based on source handle
  let edgeColor = '#888';
  let edgeLabel = '';
  let edgeGradientId = `edge-gradient-${id}`;
  let animationName = `flow-${id}`;

  if (sourceHandleId === 'true') {
    edgeColor = '#16a34a'; // green
    edgeLabel = 'True';
    edgeGradientId = `edge-gradient-true-${id}`;
    animationName = `flow-true-${id}`;
  } else if (sourceHandleId === 'false') {
    edgeColor = '#dc2626'; // red
    edgeLabel = 'False';
    edgeGradientId = `edge-gradient-false-${id}`;
    animationName = `flow-false-${id}`;
  }

  // Create a unique animation keyframe for this edge
  const animationKeyframes = `
    @keyframes ${animationName} {
      0% {
        stroke-dashoffset: 24;
      }
      100% {
        stroke-dashoffset: 0;
      }
    }
  `;

  // Create a custom marker with the edge color
  const markerId = `marker-${id}`;

  return (
    <>
      <style>{animationKeyframes}</style>
      <defs>
        <linearGradient id={edgeGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={edgeColor} stopOpacity="0.5" />
          <stop offset="100%" stopColor={edgeColor} />
        </linearGradient>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={edgeColor} />
        </marker>
      </defs>
      <path
        id={id}
        style={{
          ...style,
          stroke: `url(#${edgeGradientId})`,
          strokeWidth: 3,
          strokeDasharray: '12 12',
          animation: `${animationName} 1s linear infinite`,
          filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.1))'
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={`url(#${markerId})`}
      />
      {edgeLabel && (
        <text
          style={{ 
            fill: edgeColor, 
            fontWeight: 600,
            filter: 'drop-shadow(0px 1px 1px rgba(255, 255, 255, 0.8))'
          }}
          x={labelX}
          y={labelY}
          dominantBaseline="middle"
          textAnchor="middle"
          className="text-xs"
        >
          {edgeLabel}
        </text>
      )}
    </>
  );
};

// Define edge types
const edgeTypes = {
  custom: CustomEdge,
};

  // Custom node components
const CustomNodeTypes: Record<string, React.ComponentType<any>> = {
  webhook: ({ data, id }: { data: any, id: string }) => {
    // Use the useReactFlow hook to get access to the activeNodeIds state
    const { getNodes } = useReactFlow();
    const isActive = data.isActive;

    return (
      <div className={`p-3 rounded-md border relative transition-all duration-300 ${
        isActive 
          ? 'bg-purple-100 border-purple-400 shadow-md' 
          : 'bg-purple-50 border-purple-200'
      }`} style={{ width: data.width || 180, height: data.height || 'auto', minHeight: 60 }}>
        <NodeResizer 
          minWidth={150} 
          minHeight={60} 
          isVisible={data.selected} 
          lineClassName="border-blue-400"
          handleClassName="h-3 w-3 bg-white border-2 border-blue-400 rounded"
          onResize={(event, { width, height }) => {
            // This will be handled by the node change handler
          }}
        />
        {/* Output handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{ background: '#9333ea', width: '10px', height: '10px' }}
        />
        <div className="font-medium text-purple-700">{data.label}</div>
        <div className="text-xs text-purple-500 mt-1">Webhook Trigger</div>
        {isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        )}
      </div>
    );
  },
  aws: ({ data }: { data: any }) => {
    const isActive = data.isActive;

    return (
      <div className={`p-3 rounded-md border relative transition-all duration-300 ${
        isActive 
          ? 'bg-yellow-100 border-yellow-400 shadow-md' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        {/* Input handle */}
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{ background: '#f59e0b', width: '10px', height: '10px' }}
        />
        {/* Output handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{ background: '#f59e0b', width: '10px', height: '10px' }}
        />
        <div className="font-medium text-yellow-700">{data.label}</div>
        <div className="text-xs text-yellow-500 mt-1">AWS Service</div>
        {isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        )}
      </div>
    );
  },
  gitlab: ({ data }: { data: any }) => {
    const isActive = data.isActive;

    return (
      <div className={`p-3 rounded-md border relative transition-all duration-300 ${
        isActive 
          ? 'bg-orange-100 border-orange-400 shadow-md' 
          : 'bg-orange-50 border-orange-200'
      }`}>
        {/* Output handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{ background: '#ea580c', width: '10px', height: '10px' }}
        />
        <div className="font-medium text-orange-700">{data.label}</div>
        <div className="text-xs text-orange-500 mt-1">GitLab Trigger</div>
        {isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        )}
      </div>
    );
  },
  jira: ({ data }: { data: any }) => {
    const isActive = data.isActive;

    return (
      <div className={`p-3 rounded-md border relative transition-all duration-300 ${
        isActive 
          ? 'bg-blue-100 border-blue-400 shadow-md' 
          : 'bg-blue-50 border-blue-200'
      }`}>
        {/* Output handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{ background: '#2563eb', width: '10px', height: '10px' }}
        />
        <div className="font-medium text-blue-700">{data.label}</div>
        <div className="text-xs text-blue-500 mt-1">Jira Trigger</div>
        {isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        )}
      </div>
    );
  },
  condition: ({ data }: { data: any }) => {
    const isActive = data.isActive;
    const nodeHeight = data.height || 100;

    return (
      <div className={`p-3 rounded-md border relative transition-all duration-300 ${
        isActive 
          ? 'bg-yellow-100 border-yellow-400 shadow-md' 
          : 'bg-yellow-50 border-yellow-200'
      }`} style={{ width: data.width || 200, height: nodeHeight, minHeight: 100 }}>
        <NodeResizer 
          minWidth={180} 
          minHeight={100} 
          isVisible={data.selected} 
          lineClassName="border-blue-400"
          handleClassName="h-3 w-3 bg-white border-2 border-blue-400 rounded"
        />
        {/* Input handle */}
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{ background: '#ca8a04', width: '10px', height: '10px' }}
        />
        {/* Output handles for true/false paths - position dynamically based on node height */}
        <Handle
          type="source"
          position={Position.Right}
          id="true"
          style={{ 
            background: '#16a34a', 
            width: '10px', 
            height: '10px', 
            top: `${Math.max(35, Math.min(nodeHeight * 0.35, 35))}%` 
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="false"
          style={{ 
            background: '#dc2626', 
            width: '10px', 
            height: '10px', 
            top: `${Math.max(65, Math.min(nodeHeight * 0.65, 65))}%` 
          }}
        />
        <div className="font-medium text-yellow-700">{data.label}</div>
        <div className="text-xs text-yellow-500 mt-1">Condition</div>
        <div className="flex justify-between mt-2 text-xs">
          <span></span>
          <div className="flex flex-col items-end">
            <span className="text-green-600">True ↑</span>
            <span className="text-red-600">False ↓</span>
          </div>
        </div>
        {isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        )}
      </div>
    );
  },
  dataValidation: ({ data }: { data: any }) => {
    const isActive = data.isActive;

    return (
      <div className={`p-3 rounded-md border relative transition-all duration-300 ${
        isActive 
          ? 'bg-green-100 border-green-400 shadow-md' 
          : 'bg-green-50 border-green-200'
      }`}>
        {/* Input handle */}
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{ background: '#16a34a', width: '10px', height: '10px' }}
        />
        {/* Output handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{ background: '#16a34a', width: '10px', height: '10px' }}
        />
        <div className="font-medium text-green-700">{data.label}</div>
        <div className="text-xs text-green-500 mt-1">Data Validation</div>
        {isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        )}
      </div>
    );
  },
  childFlow: ({ data }: { data: any }) => {
    const isActive = data.isActive;

    return (
      <div className={`p-3 rounded-md border relative transition-all duration-300 ${
        isActive 
          ? 'bg-indigo-100 border-indigo-400 shadow-md' 
          : 'bg-indigo-50 border-indigo-200'
      }`}>
        {/* Input handle */}
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{ background: '#4f46e5', width: '10px', height: '10px' }}
        />
        {/* Output handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{ background: '#4f46e5', width: '10px', height: '10px' }}
        />
        <div className="font-medium text-indigo-700">{data.label}</div>
        <div className="text-xs text-indigo-500 mt-1">Child Flow</div>
        {isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        )}
      </div>
    );
  },
  owlflowValidator: ({ data }: { data: any }) => {
    const isActive = data.isActive;

    return (
      <div className={`p-3 rounded-md border relative transition-all duration-300 ${
        isActive 
          ? 'bg-teal-100 border-teal-400 shadow-md' 
          : 'bg-teal-50 border-teal-200'
      }`}>
        {/* Input handle */}
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{ background: '#14b8a6', width: '10px', height: '10px' }}
        />
        {/* Output handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{ background: '#14b8a6', width: '10px', height: '10px' }}
        />
        <div className="font-medium text-teal-700">{data.label}</div>
        <div className="text-xs text-teal-500 mt-1">OwlFlow Validator</div>
        {isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        )}
      </div>
    );
  },
};

interface Webhook {
  id: string;
  name: string;
}

interface Flow {
  id: string;
  name: string;
}

// Wrap the main component with ReactFlowProvider from @xyflow/react
export default function CanvasFlowPageWrapper() {
  return (
    <ReactFlowProvider>
      <CanvasFlowPage />
    </ReactFlowProvider>
  );
}

function CanvasFlowPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated: () => router.push('/?redirect=/owlflow/flows/canvas'),
  });

  // Basic flow information
  const [flowInfo, setFlowInfo] = useState({
    name: '',
    description: '',
    isEnabled: true,
  });

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Get the React Flow instance for undo/redo functionality
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
  const [canvasHeight, setCanvasHeight] = useState<number>(600);

  // Simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeNodeIds, setActiveNodeIds] = useState<Set<string>>(new Set());

  // Data for dropdowns
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [parentFlows, setParentFlows] = useState<Flow[]>([]);

  // Reference to the React Flow instance
  const xyflowWrapper = useRef(null);

  // Node types available for dragging
  const nodeTypes = [
    { type: 'webhook', label: 'Webhook Trigger', category: 'Triggers' },
    { type: 'gitlab', label: 'GitLab Trigger', category: 'Triggers' },
    { type: 'jira', label: 'Jira Trigger', category: 'Triggers' },
    { type: 'condition', label: 'Condition', category: 'Logic' },
    { type: 'dataValidation', label: 'Data Validation', category: 'Logic' },
    { type: 'aws', label: 'AWS Service', category: 'Services' },
    { type: 'owlflowValidator', label: 'OwlFlow Validator', category: 'Services' },
    { type: 'childFlow', label: 'Child Flow', category: 'Actions' }
  ];

  // Generate a unique ID for new nodes and edges
  const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Simulation functions
  const startSimulation = useCallback(() => {
    if (isSimulating) return;

    setIsSimulating(true);

    // Reset all nodes to inactive
    setNodes(nds => 
      nds.map(node => ({
        ...node,
        data: { ...node.data, isActive: false }
      }))
    );

    // Start with trigger nodes
    const triggerNodes = nodes.filter(node => 
      ['webhook', 'gitlab', 'jira'].includes(node.type)
    );

    if (triggerNodes.length === 0) {
      setError("No trigger nodes found to start simulation");
      setIsSimulating(false);
      return;
    }

    // Activate the first trigger node
    const firstTrigger = triggerNodes[0];
    simulateNodeActivation(firstTrigger.id);
  }, [nodes, isSimulating, setNodes]);

  const stopSimulation = useCallback(() => {
    setIsSimulating(false);

    // Reset all nodes to inactive
    setNodes(nds => 
      nds.map(node => ({
        ...node,
        data: { ...node.data, isActive: false }
      }))
    );
  }, [setNodes]);

  const simulateNodeActivation = useCallback((nodeId: string) => {
    if (!isSimulating) return;

    // Activate the node
    setNodes(nds => 
      nds.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, isActive: true } } 
          : node
      )
    );

    // Find outgoing edges
    const outgoingEdges = edges.filter(edge => edge.source === nodeId);

    // If it's a condition node, randomly choose true or false path
    const currentNode = nodes.find(node => node.id === nodeId);
    if (currentNode?.type === 'condition') {
      const randomPath = Math.random() > 0.5 ? 'true' : 'false';
      const filteredEdges = outgoingEdges.filter(edge => edge.sourceHandle === randomPath);

      // Deactivate the node after a delay
      setTimeout(() => {
        setNodes(nds => 
          nds.map(node => 
            node.id === nodeId 
              ? { ...node, data: { ...node.data, isActive: false } } 
              : node
          )
        );

        // Activate the next nodes
        filteredEdges.forEach(edge => {
          setTimeout(() => {
            simulateNodeActivation(edge.target);
          }, 500);
        });
      }, 1000);

      return;
    }

    // Deactivate the node after a delay
    setTimeout(() => {
      setNodes(nds => 
        nds.map(node => 
          node.id === nodeId 
            ? { ...node, data: { ...node.data, isActive: false } } 
            : node
        )
      );

      // Activate the next nodes
      outgoingEdges.forEach(edge => {
        setTimeout(() => {
          simulateNodeActivation(edge.target);
        }, 500);
      });

      // If no outgoing edges and still simulating, restart with a trigger
      if (outgoingEdges.length === 0 && isSimulating) {
        setTimeout(() => {
          const triggerNodes = nodes.filter(node => 
            ['webhook', 'gitlab', 'jira'].includes(node.type)
          );
          if (triggerNodes.length > 0) {
            simulateNodeActivation(triggerNodes[0].id);
          } else {
            stopSimulation();
          }
        }, 1000);
      }
    }, 1000);
  }, [nodes, edges, isSimulating, setNodes, stopSimulation]);

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
    // Process resize events
    const resizeChanges = changes.filter(change => 
      change.type === 'dimensions' || 
      (change.type === 'select' && change.selected === true)
    );

    if (resizeChanges.length > 0) {
      setNodes(nds => 
        nds.map(node => {
          const change = resizeChanges.find(c => c.id === node.id);
          if (change && change.type === 'dimensions') {
            // Update node dimensions in data
            return {
              ...node,
              data: {
                ...node.data,
                width: (change as any).dimensions?.width || node.data.width,
                height: (change as any).dimensions?.height || node.data.height,
                selected: true
              }
            };
          } else if (change && change.type === 'select') {
            // Update selected state
            return {
              ...node,
              data: {
                ...node.data,
                selected: change.selected
              }
            };
          }
          // If node is not being resized, ensure it's not marked as selected
          if (resizeChanges.some(c => c.type === 'select') && !resizeChanges.find(c => c.id === node.id)) {
            return {
              ...node,
              data: {
                ...node.data,
                selected: false
              }
            };
          }
          return node;
        })
      );
    }

    // Only save to history for certain types of changes
    const significantChanges = changes.filter(
      change => change.type === 'remove' || change.type === 'add' || 
      (change.type === 'position' && (change as any).dragging === false) ||
      change.type === 'dimensions'
    );

    if (significantChanges.length > 0) {
      saveToHistory();
    }

    onNodesChange(changes);
  }, [onNodesChange, saveToHistory, setNodes]);

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

    // Get the node type from the dragged element
    const nodeType = event.dataTransfer.getData('application/xyflow');

    if (!nodeType || !xyflowWrapper.current) {
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

    // Set initial dimensions based on node type
    let initialWidth = 180;
    let initialHeight = 80;

    if (nodeType === 'condition') {
      initialWidth = 200;
      initialHeight = 100;
    } else if (['dataValidation', 'aws', 'owlflowValidator'].includes(nodeType)) {
      initialWidth = 200;
      initialHeight = 90;
    }

    // Create a new node
    const newNode = {
      id: generateId('node'),
      type: nodeType,
      position,
      data: {
        label: nodeTypes.find(n => n.type === nodeType)?.label || nodeType,
        type: nodeType,
        config: {},
        width: initialWidth,
        height: initialHeight,
        selected: true
      }
    };

    // Add the new node to the React Flow state and deselect other nodes
    setNodes((nds) => 
      nds.map(node => ({
        ...node,
        data: { ...node.data, selected: false }
      })).concat(newNode)
    );

    // Select the new node for editing
    setSelectedNode(newNode);
    setShowNodePanel(true);
  }, [nodeTypes, setNodes, saveToHistory]);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNode(node);
    setShowNodePanel(true);
  }, []);

  // Validate connection
  const isValidConnectionFunc = useCallback((connection: Connection) => {
    // Get source and target nodes
    const sourceNode = nodes.find(node => node.id === connection.source);
    const targetNode = nodes.find(node => node.id === connection.target);

    if (!sourceNode || !targetNode) return false;

    // Prevent connections to trigger nodes
    if (['webhook', 'gitlab', 'jira'].includes(targetNode.type)) {
      setIsValidConnection(false);
      setTimeout(() => setIsValidConnection(true), 500); // Reset after 500ms
      return false;
    }

    // Prevent self-connections
    if (connection.source === connection.target) {
      setIsValidConnection(false);
      setTimeout(() => setIsValidConnection(true), 500); // Reset after 500ms
      return false;
    }

    // Check for circular references (simplified)
    // A more complex algorithm would be needed for deep circular reference detection
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
      type: 'custom', // Use our custom edge type
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
    };

    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges, saveToHistory, isValidConnectionFunc]);

  // Update node data
  const updateNodeData = useCallback((nodeId: string, data: any) => {
    // Save current state to history before updating node data
    saveToHistory();

    setNodes((nds) => 
      nds.map((node) => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...data } } 
          : node
      )
    );
  }, [setNodes, saveToHistory]);

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    // Save current state to history before deleting a node
    saveToHistory();

    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
    setShowNodePanel(false);
  }, [setNodes, setEdges, saveToHistory]);

  // Handle form field changes
  const handleChange = (field: keyof typeof flowInfo, value: any) => {
    setFlowInfo({ ...flowInfo, [field]: value });
  };

  // Validate flow before submission
  const validateFlow = (): string | null => {
    // Check for basic requirements
    if (!flowInfo.name.trim()) {
      return "Flow name is required";
    }

    if (nodes.length === 0) {
      return "At least one node is required";
    }

    // Check for trigger nodes (at least one required)
    const triggerNodes = nodes.filter(node => 
      ['webhook', 'gitlab', 'jira'].includes(node.type)
    );

    if (triggerNodes.length === 0) {
      return "At least one trigger node (Webhook, GitLab, or Jira) is required";
    }

    // Check for disconnected nodes
    const connectedNodeIds = new Set<string>();

    // Add all target nodes from edges
    edges.forEach(edge => {
      connectedNodeIds.add(edge.target);
    });

    // Add all source nodes that are triggers (they don't need incoming connections)
    triggerNodes.forEach(node => {
      connectedNodeIds.add(node.id);
    });

    // Find nodes that aren't triggers and don't have incoming connections
    const disconnectedNodes = nodes.filter(node => 
      !['webhook', 'gitlab', 'jira'].includes(node.type) && 
      !connectedNodeIds.has(node.id)
    );

    if (disconnectedNodes.length > 0) {
      return `${disconnectedNodes.length} node(s) have no incoming connections`;
    }

    // Check for missing configurations
    const unconfiguredNodes = nodes.filter(node => {
      if (node.type === 'webhook' && !node.data.config.webhookId) {
        return true;
      }
      if (node.type === 'childFlow' && !node.data.config.flowId) {
        return true;
      }
      if (node.type === 'condition' && !node.data.config.field) {
        return true;
      }
      if (node.type === 'aws' && !node.data.config.service) {
        return true;
      }
      if (node.type === 'aws' && node.data.config.service === 's3' && !node.data.config.bucketName) {
        return true;
      }
      if (node.type === 'aws' && node.data.config.service === 'lambda' && !node.data.config.functionName) {
        return true;
      }
      if (node.type === 'owlflowValidator' && !node.data.config.validationType) {
        return true;
      }
      if (node.type === 'owlflowValidator' && node.data.config.validationType === 'schema' && !node.data.config.schema) {
        return true;
      }
      if (node.type === 'owlflowValidator' && node.data.config.validationType === 'custom' && !node.data.config.customCode) {
        return true;
      }
      return false;
    });

    if (unconfiguredNodes.length > 0) {
      return `${unconfiguredNodes.length} node(s) are not fully configured`;
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
        config: {
          nodes,
          edges,
          flowType: 'canvas',
          metadata: {
            isCanvasFlow: true
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

  // Fetch webhooks and flows for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch webhooks
        const webhooksResponse = await fetch('/api/webhooks');
        if (webhooksResponse.ok) {
          const webhooksData = await webhooksResponse.json();
          setWebhooks(webhooksData.webhooks || []);
        }

        // Fetch flows
        const flowsResponse = await fetch('/api/flows');
        if (flowsResponse.ok) {
          const flowsData = await flowsResponse.json();
          setParentFlows(flowsData.flows || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.isSuperUser) {
      fetchData();
    }
  }, [session]);

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

      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create Flow (Canvas Editor)</h1>
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
      </div>

      {/* Canvas Editor */}
      <div className="bg-white rounded-lg shadow p-6" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Flow Canvas</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Canvas Height:</span>
            <input
              type="range"
              min="400"
              max="1200"
              step="50"
              value={canvasHeight}
              onChange={(e) => setCanvasHeight(parseInt(e.target.value))}
              className="w-32"
            />
            <span className="text-sm text-gray-500">{canvasHeight}px</span>
          </div>
        </div>

        <div className="flex" style={{ height: `${canvasHeight}px` }}>
          {/* Node Palette */}
          <div className="w-64 border-r border-gray-200 p-4">
            <h3 className="text-sm font-medium mb-3">Nodes</h3>

            {/* Group nodes by category */}
            {['Triggers', 'Logic', 'Services', 'Actions'].map(category => (
              <div key={category} className="mb-4">
                <h4 className="text-xs uppercase text-gray-500 mb-2">{category}</h4>
                <div className="space-y-2">
                  {nodeTypes
                    .filter(node => node.category === category)
                    .map(node => (
                      <div
                        key={node.type}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData('application/xyflow', node.type);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        className="p-2 bg-blue-50 border border-blue-200 rounded cursor-move hover:bg-blue-100"
                      >
                        {node.label}
                      </div>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>

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
                  <p>Drag and drop nodes from the palette to create your flow</p>
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
              nodeTypes={CustomNodeTypes}
              edgeTypes={edgeTypes}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
              connectionLineStyle={{
                stroke: isValidConnection ? '#3b82f6' : '#ff0072',
                strokeWidth: 3,
                strokeDasharray: '8 8',
                animation: 'flowAnimation 1s linear infinite',
                filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.1))'
              }}
              connectionLineComponent={({ fromX, fromY, toX, toY, connectionStatus }) => {
                const path = `M ${fromX} ${fromY} C ${fromX + 50} ${fromY}, ${toX - 50} ${toY}, ${toX} ${toY}`;
                return (
                  <>
                    <style>
                      {`
                        @keyframes flowAnimation {
                          0% {
                            stroke-dashoffset: 16;
                          }
                          100% {
                            stroke-dashoffset: 0;
                          }
                        }
                      `}
                    </style>
                    <path
                      d={path}
                      stroke={connectionStatus === 'valid' ? '#3b82f6' : '#ff0072'}
                      strokeWidth={3}
                      strokeDasharray="8 8"
                      fill="none"
                      style={{
                        animation: 'flowAnimation 1s linear infinite',
                        filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.1))'
                      }}
                    />
                  </>
                );
              }}
              isValidConnection={isValidConnectionFunc}
              defaultEdgeOptions={{
                type: 'custom', // Use our custom edge type by default
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20,
                  color: '#3b82f6',
                  strokeWidth: 2
                },
                style: { strokeWidth: 3 }
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
                  <div className="text-blue-500 text-sm font-medium">Drop to add node</div>
                </div>
              )}
              <Controls />
              <Background color="#aaa" gap={16} />
              <MiniMap />
              <Panel position="top-right" className="flex flex-col gap-2">
                <div className="flex gap-1">
                  <button
                    onClick={handleUndo}
                    disabled={history.past.length === 0 || isSimulating}
                    className="px-2 py-1 text-sm rounded-md text-white bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Undo"
                  >
                    ↩ Undo
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={history.future.length === 0 || isSimulating}
                    className="px-2 py-1 text-sm rounded-md text-white bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Redo"
                  >
                    Redo ↪
                  </button>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      // Save current state to history before adding a new node
                      saveToHistory();

                      const id = generateId('node');
                      const newNode = {
                        id,
                        type: 'condition',
                        position: { x: 100, y: 100 },
                        data: { label: 'New Condition', type: 'condition', config: {} }
                      };
                      setNodes((nds) => nds.concat(newNode));
                    }}
                    disabled={isSimulating}
                    className="px-2 py-1 text-sm rounded-md text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Condition
                  </button>
                  {isSimulating ? (
                    <button
                      onClick={stopSimulation}
                      className="px-2 py-1 text-sm rounded-md text-white bg-red-500 hover:bg-red-600"
                    >
                      Stop Simulation
                    </button>
                  ) : (
                    <button
                      onClick={startSimulation}
                      className="px-2 py-1 text-sm rounded-md text-white bg-green-500 hover:bg-green-600"
                    >
                      Simulate Flow
                    </button>
                  )}
                </div>
              </Panel>
            </ReactFlow>
          </div>

          {/* Node Configuration Panel */}
          {showNodePanel && selectedNode && (
            <div className="w-80 border-l border-gray-200 p-4 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium">Configure Node</h3>
                <button 
                  onClick={() => setShowNodePanel(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Node Label */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={selectedNode.data.label}
                    onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                    className="w-full p-2 border rounded-md border-gray-300"
                  />
                </div>

                {/* Node Type Specific Configuration */}
                {selectedNode.type === 'webhook' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Webhook
                    </label>
                    <select
                      value={selectedNode.data.config.webhookId || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { 
                        config: { ...selectedNode.data.config, webhookId: e.target.value }
                      })}
                      className="w-full p-2 border rounded-md border-gray-300"
                    >
                      <option value="">Select a webhook</option>
                      {webhooks.map((webhook) => (
                        <option key={webhook.id} value={webhook.id}>
                          {webhook.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedNode.type === 'childFlow' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Child Flow
                    </label>
                    <select
                      value={selectedNode.data.config.flowId || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { 
                        config: { ...selectedNode.data.config, flowId: e.target.value }
                      })}
                      className="w-full p-2 border rounded-md border-gray-300"
                    >
                      <option value="">Select a flow</option>
                      {parentFlows.map((flow) => (
                        <option key={flow.id} value={flow.id}>
                          {flow.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedNode.type === 'condition' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Field
                      </label>
                      <input
                        type="text"
                        value={selectedNode.data.config.field || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { 
                          config: { ...selectedNode.data.config, field: e.target.value }
                        })}
                        className="w-full p-2 border rounded-md border-gray-300"
                        placeholder="e.g. data.status"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Operator
                      </label>
                      <select
                        value={selectedNode.data.config.operator || 'equals'}
                        onChange={(e) => updateNodeData(selectedNode.id, { 
                          config: { ...selectedNode.data.config, operator: e.target.value }
                        })}
                        className="w-full p-2 border rounded-md border-gray-300"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                        <option value="contains">Contains</option>
                        <option value="not_contains">Not Contains</option>
                        <option value="exists">Exists</option>
                        <option value="not_exists">Not Exists</option>
                        <option value="greater_than">Greater Than</option>
                        <option value="less_than">Less Than</option>
                      </select>
                    </div>

                    {selectedNode.data.config.operator !== 'exists' && 
                     selectedNode.data.config.operator !== 'not_exists' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Value
                        </label>
                        <input
                          type="text"
                          value={selectedNode.data.config.value || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, { 
                            config: { ...selectedNode.data.config, value: e.target.value }
                          })}
                          className="w-full p-2 border rounded-md border-gray-300"
                          placeholder="Enter value"
                        />
                      </div>
                    )}
                  </div>
                )}

                {selectedNode.type === 'aws' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        AWS Service
                      </label>
                      <select
                        value={selectedNode.data.config.service || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { 
                          config: { ...selectedNode.data.config, service: e.target.value }
                        })}
                        className="w-full p-2 border rounded-md border-gray-300"
                      >
                        <option value="">Select a service</option>
                        <option value="s3">S3</option>
                        <option value="lambda">Lambda</option>
                        <option value="ec2">EC2</option>
                        <option value="rds">RDS</option>
                        <option value="dynamodb">DynamoDB</option>
                      </select>
                    </div>

                    {selectedNode.data.config.service === 's3' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Bucket Name
                        </label>
                        <input
                          type="text"
                          value={selectedNode.data.config.bucketName || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, { 
                            config: { ...selectedNode.data.config, bucketName: e.target.value }
                          })}
                          className="w-full p-2 border rounded-md border-gray-300"
                          placeholder="Enter bucket name"
                        />
                      </div>
                    )}

                    {selectedNode.data.config.service === 'lambda' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Function Name
                        </label>
                        <input
                          type="text"
                          value={selectedNode.data.config.functionName || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, { 
                            config: { ...selectedNode.data.config, functionName: e.target.value }
                          })}
                          className="w-full p-2 border rounded-md border-gray-300"
                          placeholder="Enter function name"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Region
                      </label>
                      <select
                        value={selectedNode.data.config.region || 'us-east-1'}
                        onChange={(e) => updateNodeData(selectedNode.id, { 
                          config: { ...selectedNode.data.config, region: e.target.value }
                        })}
                        className="w-full p-2 border rounded-md border-gray-300"
                      >
                        <option value="us-east-1">US East (N. Virginia)</option>
                        <option value="us-east-2">US East (Ohio)</option>
                        <option value="us-west-1">US West (N. California)</option>
                        <option value="us-west-2">US West (Oregon)</option>
                        <option value="eu-west-1">EU (Ireland)</option>
                        <option value="eu-central-1">EU (Frankfurt)</option>
                        <option value="ap-south-1">Asia Pacific (Mumbai)</option>
                        <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedNode.type === 'owlflowValidator' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Validation Type
                      </label>
                      <select
                        value={selectedNode.data.config.validationType || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { 
                          config: { ...selectedNode.data.config, validationType: e.target.value }
                        })}
                        className="w-full p-2 border rounded-md border-gray-300"
                      >
                        <option value="">Select validation type</option>
                        <option value="schema">Schema Validation</option>
                        <option value="format">Format Validation</option>
                        <option value="custom">Custom Validation</option>
                      </select>
                    </div>

                    {selectedNode.data.config.validationType === 'schema' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Schema Definition
                        </label>
                        <textarea
                          value={selectedNode.data.config.schema || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, { 
                            config: { ...selectedNode.data.config, schema: e.target.value }
                          })}
                          className="w-full p-2 border rounded-md border-gray-300"
                          placeholder="Enter JSON schema"
                          rows={4}
                        />
                      </div>
                    )}

                    {selectedNode.data.config.validationType === 'custom' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Custom Validation Code
                        </label>
                        <textarea
                          value={selectedNode.data.config.customCode || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, { 
                            config: { ...selectedNode.data.config, customCode: e.target.value }
                          })}
                          className="w-full p-2 border rounded-md border-gray-300"
                          placeholder="Enter custom validation code"
                          rows={4}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Error Handling
                      </label>
                      <select
                        value={selectedNode.data.config.errorHandling || 'stop'}
                        onChange={(e) => updateNodeData(selectedNode.id, { 
                          config: { ...selectedNode.data.config, errorHandling: e.target.value }
                        })}
                        className="w-full p-2 border rounded-md border-gray-300"
                      >
                        <option value="stop">Stop Flow on Error</option>
                        <option value="continue">Continue with Warning</option>
                        <option value="retry">Retry Validation</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Delete Node Button */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => deleteNode(selectedNode.id)}
                    className="w-full p-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                  >
                    Delete Node
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>Tip: You can drag nodes to reposition them and connect them by dragging from one node's handle to another.</p>
        </div>
      </div>
    </div>
  );
}
