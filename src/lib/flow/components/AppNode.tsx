/**
 * AppNode.tsx
 * 
 * Base component for rendering app nodes in the flow editor.
 * This component can be used to render any app node based on its configuration.
 */

import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { AppRegistry } from '../AppNodeInterface';

// Props for the AppNode component
interface AppNodeProps extends NodeProps {
  data: {
    appId: string;
    appName: string;
    nodeName?: string; // Custom node name
    actionId: string;
    actionName: string;
    config: Record<string, any>;
    inputs: Record<string, any>;
    outputs?: Record<string, any>;
    status?: 'idle' | 'running' | 'success' | 'error';
    error?: string;
    isActive?: boolean;
    selected?: boolean;
  };
}

// Component for rendering app nodes
const AppNode: React.FC<AppNodeProps> = ({ id, data, selected }) => {
  // Get app definition from registry
  const [appDefinition, setAppDefinition] = useState<any>(null);
  const [actionDefinition, setActionDefinition] = useState<any>(null);

  // Get the React Flow instance
  const { getNodes } = useReactFlow();

  // Load app and action definitions
  useEffect(() => {
    if (data.appId) {
      const app = AppRegistry.getApp(data.appId);
      if (app) {
        setAppDefinition(app);

        // Find the selected action
        const action = app.actions.find(a => a.id === data.actionId);
        if (action) {
          setActionDefinition(action);
        }
      }
    }
  }, [data.appId, data.actionId]);

  // Determine node color based on app or status
  const getNodeColor = () => {
    if (data.status === 'error') return '#dc2626'; // Red for error
    if (data.status === 'running') return '#2563eb'; // Blue for running
    if (data.status === 'success') return '#16a34a'; // Green for success
    return appDefinition?.color || '#6b7280'; // Default to app color or gray
  };

  // Get icon for the app
  const getAppIcon = () => {
    // This is a placeholder - in a real implementation, you would use your icon system
    return appDefinition?.icon || 'app';
  };

  return (
    <div 
      className={`p-3 rounded-md border relative transition-all duration-300 ${
        data.isActive 
          ? 'shadow-md' 
          : ''
      }`}
      style={{ 
        backgroundColor: `${getNodeColor()}15`, // 15% opacity of the color
        borderColor: selected ? getNodeColor() : `${getNodeColor()}50`, // 50% opacity if not selected
        borderWidth: selected ? '2px' : '1px',
        minWidth: 200,
        minHeight: 80
      }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ 
          background: getNodeColor(), 
          width: '10px', 
          height: '10px' 
        }}
      />

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ 
          background: getNodeColor(), 
          width: '10px', 
          height: '10px' 
        }}
      />

      {/* App header */}
      <div className="flex items-center mb-2">
        <div 
          className="w-6 h-6 rounded-full flex items-center justify-center mr-2"
          style={{ backgroundColor: getNodeColor() }}
        >
          <span className="text-white text-xs">{getAppIcon()}</span>
        </div>
        <div className="font-medium" style={{ color: getNodeColor() }}>
          {data.nodeName || data.appName || 'App'}
        </div>
      </div>

      {/* Action name */}
      <div className="text-sm text-gray-600 mb-1">
        {data.actionName || 'Action'}
      </div>

      {/* Status indicator */}
      {data.status && data.status !== 'idle' && (
        <div className="text-xs mt-2 flex items-center">
          <div 
            className={`w-2 h-2 rounded-full mr-1 ${
              data.status === 'running' ? 'bg-blue-500 animate-pulse' :
              data.status === 'success' ? 'bg-green-500' :
              data.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
            }`}
          />
          <span className={`
            ${data.status === 'running' ? 'text-blue-500' :
              data.status === 'success' ? 'text-green-500' :
              data.status === 'error' ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
          </span>
        </div>
      )}

      {/* Error message */}
      {data.status === 'error' && data.error && (
        <div className="text-xs text-red-500 mt-1 truncate" title={data.error}>
          {data.error}
        </div>
      )}

      {/* Active indicator */}
      {data.isActive && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
      )}
    </div>
  );
};

export default AppNode;
