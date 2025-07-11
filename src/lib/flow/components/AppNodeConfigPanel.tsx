/**
 * AppNodeConfigPanel.tsx
 * 
 * Component for configuring app nodes in the flow editor.
 * This component provides a UI for selecting apps, actions, and configuring inputs.
 */

import React, { useState, useEffect } from 'react';
import { AppRegistry, AppDefinition, AppAction, AppNodeInput } from '../AppNodeInterface';

// Props for the AppNodeConfigPanel component
interface AppNodeConfigPanelProps {
  nodeId: string;
  data: {
    appId?: string;
    appName?: string;
    nodeName?: string; // Custom node name
    actionId?: string;
    actionName?: string;
    config?: Record<string, any>;
    inputs?: Record<string, any>;
  };
  onUpdate: (nodeId: string, updates: Record<string, any>) => void;
  onClose?: () => void;
  onDeleteNode?: (nodeId: string, newAppId?: string) => void;
}

// Component for configuring app nodes
const AppNodeConfigPanel: React.FC<AppNodeConfigPanelProps> = ({ 
  nodeId, 
  data, 
  onUpdate,
  onClose,
  onDeleteNode
}) => {
  // State for available apps and selected app/action
  const [apps, setApps] = useState<AppDefinition[]>([]);
  const [selectedApp, setSelectedApp] = useState<AppDefinition | null>(null);
  const [selectedAction, setSelectedAction] = useState<AppAction | null>(null);

  // State for form values
  const [formValues, setFormValues] = useState<Record<string, any>>({
    config: data.config || {},
    inputs: data.inputs || {},
  });

  // State for node name
  const [nodeName, setNodeName] = useState<string>(data.nodeName || '');

  // State for validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // We no longer need app change confirmation since we don't show the dropdown for existing nodes

  // Load available apps
  useEffect(() => {
    setApps(AppRegistry.getAllApps());
  }, []);

  // Load selected app and action when data changes
  useEffect(() => {
    if (data.appId) {
      const app = AppRegistry.getApp(data.appId);
      if (app) {
        setSelectedApp(app);

        if (data.actionId) {
          const action = app.actions.find(a => a.id === data.actionId);
          if (action) {
            setSelectedAction(action);
          }
        }
      }
    }

    // Initialize form values
    setFormValues({
      config: data.config || {},
      inputs: data.inputs || {},
    });

    // Initialize node name
    setNodeName(data.nodeName || '');
  }, [data]);

  // Handle app selection (only for new nodes)
  const handleAppSelect = (appId: string) => {
    // If the app is already selected, do nothing
    if (data.appId === appId) return;

    // For new nodes
    const app = AppRegistry.getApp(appId);
    if (app) {
      setSelectedApp(app);
      setSelectedAction(null);

      // Update node name state
      setNodeName(app.name);

      // Update node data
      onUpdate(nodeId, {
        appId: app.id,
        appName: app.name,
        nodeName: app.name, // Initialize node name with app name
        actionId: '',
        actionName: '',
        config: {
          ...formValues.config,
          authType: app.defaultAuthType || 'none',
          authConfig: app.defaultAuthConfig || {},
        },
        inputs: {},
      });

      // Update form values
      setFormValues(prev => ({
        ...prev,
        config: {
          ...prev.config,
          authType: app.defaultAuthType || 'none',
          authConfig: app.defaultAuthConfig || {},
        },
        inputs: {},
      }));
    }
  };

  // Handle action selection
  const handleActionSelect = (actionId: string) => {
    if (!selectedApp) return;

    const action = selectedApp.actions.find(a => a.id === actionId);
    if (action) {
      setSelectedAction(action);

      // Initialize inputs with default values
      const initialInputs: Record<string, any> = {};
      action.inputs.forEach(input => {
        if (input.default !== undefined) {
          initialInputs[input.id] = input.default;
        }
      });

      // Update node data
      onUpdate(nodeId, {
        actionId: action.id,
        actionName: action.name,
        inputs: initialInputs,
      });

      // Update form values
      setFormValues(prev => ({
        ...prev,
        inputs: initialInputs,
      }));
    }
  };

  // Handle input change
  const handleInputChange = (inputId: string, value: any) => {
    // Update form values
    setFormValues(prev => ({
      ...prev,
      inputs: {
        ...prev.inputs,
        [inputId]: value,
      },
    }));

    // Update node data
    onUpdate(nodeId, {
      inputs: {
        ...formValues.inputs,
        [inputId]: value,
      },
    });

    // Clear error for this input
    if (errors[inputId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[inputId];
        return newErrors;
      });
    }
  };

  // Handle auth config change
  const handleAuthConfigChange = (key: string, value: any) => {
    // Update form values
    setFormValues(prev => ({
      ...prev,
      config: {
        ...prev.config,
        authConfig: {
          ...prev.config.authConfig,
          [key]: value,
        },
      },
    }));

    // Update node data
    onUpdate(nodeId, {
      config: {
        ...formValues.config,
        authConfig: {
          ...formValues.config.authConfig,
          [key]: value,
        },
      },
    });
  };

  // Validate the configuration
  const validateConfig = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate required inputs
    if (selectedAction) {
      selectedAction.inputs.forEach(input => {
        if (input.required && (formValues.inputs[input.id] === undefined || formValues.inputs[input.id] === '')) {
          newErrors[input.id] = `${input.label} is required`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Render input field based on type
  const renderInputField = (input: AppNodeInput) => {
    const value = formValues.inputs[input.id];
    const error = errors[input.id];

    switch (input.type) {
      case 'string':
        return (
          <div className="mb-4" key={input.id}>
            <label className="block text-sm font-medium mb-1">
              {input.label} {input.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleInputChange(input.id, e.target.value)}
              placeholder={input.placeholder}
              className={`w-full p-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'}`}
            />
            {input.description && (
              <p className="text-xs text-gray-500 mt-1">{input.description}</p>
            )}
            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div className="mb-4" key={input.id}>
            <label className="block text-sm font-medium mb-1">
              {input.label} {input.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              value={value || ''}
              onChange={(e) => handleInputChange(input.id, parseFloat(e.target.value))}
              min={input.validation?.min}
              max={input.validation?.max}
              className={`w-full p-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'}`}
            />
            {input.description && (
              <p className="text-xs text-gray-500 mt-1">{input.description}</p>
            )}
            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div className="mb-4" key={input.id}>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => handleInputChange(input.id, e.target.checked)}
                className="mr-2"
              />
              <label className="text-sm font-medium">
                {input.label}
              </label>
            </div>
            {input.description && (
              <p className="text-xs text-gray-500 mt-1">{input.description}</p>
            )}
          </div>
        );

      case 'object':
      case 'array':
        return (
          <div className="mb-4" key={input.id}>
            <label className="block text-sm font-medium mb-1">
              {input.label} {input.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={value ? JSON.stringify(value, null, 2) : ''}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleInputChange(input.id, parsed);
                } catch (err) {
                  // Allow invalid JSON while typing
                  // We'll validate on blur
                }
              }}
              onBlur={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleInputChange(input.id, parsed);
                } catch (err) {
                  setErrors(prev => ({
                    ...prev,
                    [input.id]: 'Invalid JSON',
                  }));
                }
              }}
              rows={5}
              className={`w-full p-2 border rounded-md font-mono text-sm ${error ? 'border-red-500' : 'border-gray-300'}`}
              placeholder={`{\n  "key": "value"\n}`}
            />
            {input.description && (
              <p className="text-xs text-gray-500 mt-1">{input.description}</p>
            )}
            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Render auth config fields based on auth type
  const renderAuthConfig = () => {
    const authType = formValues.config?.authType;
    const authConfig = formValues.config?.authConfig || {};

    switch (authType) {
      case 'apiKey':
        return (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">API Key Authentication</h3>
            <div className="mb-2">
              <label className="block text-xs mb-1">API Key</label>
              <input
                type="text"
                value={authConfig.apiKey || ''}
                onChange={(e) => handleAuthConfigChange('apiKey', e.target.value)}
                className="w-full p-2 border rounded-md border-gray-300"
                placeholder="Enter API key"
              />
            </div>
            <div className="mb-2">
              <label className="block text-xs mb-1">Header Name</label>
              <input
                type="text"
                value={authConfig.headerName || 'Authorization'}
                onChange={(e) => handleAuthConfigChange('headerName', e.target.value)}
                className="w-full p-2 border rounded-md border-gray-300"
                placeholder="Authorization"
              />
            </div>
          </div>
        );

      case 'oauth2':
        return (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">OAuth 2.0 Authentication</h3>
            <div className="mb-2">
              <label className="block text-xs mb-1">Access Token</label>
              <input
                type="text"
                value={authConfig.accessToken || ''}
                onChange={(e) => handleAuthConfigChange('accessToken', e.target.value)}
                className="w-full p-2 border rounded-md border-gray-300"
                placeholder="Enter access token"
              />
            </div>
            <button
              className="px-2 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
              onClick={() => {
                // In a real implementation, this would open an OAuth flow
                alert('OAuth flow would open here');
              }}
            >
              Connect Account
            </button>
          </div>
        );

      case 'basic':
        return (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Basic Authentication</h3>
            <div className="mb-2">
              <label className="block text-xs mb-1">Username</label>
              <input
                type="text"
                value={authConfig.username || ''}
                onChange={(e) => handleAuthConfigChange('username', e.target.value)}
                className="w-full p-2 border rounded-md border-gray-300"
                placeholder="Enter username"
              />
            </div>
            <div className="mb-2">
              <label className="block text-xs mb-1">Password</label>
              <input
                type="password"
                value={authConfig.password || ''}
                onChange={(e) => handleAuthConfigChange('password', e.target.value)}
                className="w-full p-2 border rounded-md border-gray-300"
                placeholder="Enter password"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Configure Node</h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      {/* App Selection - only shown for new nodes without an app */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          App
        </label>
        {data.appId ? (
          // For existing nodes, just show the app name
          <div className="p-2 border rounded-md border-gray-300 bg-gray-50">
            {data.appName || selectedApp?.name || 'Unknown App'}
          </div>
        ) : (
          // For new nodes, show the dropdown
          <select
            value={selectedApp?.id || ''}
            onChange={(e) => handleAppSelect(e.target.value)}
            className="w-full p-2 border rounded-md border-gray-300"
          >
            <option value="">Select an app</option>
            {apps.map(app => (
              <option key={app.id} value={app.id}>{app.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Node Name - allows customizing the node's display name */}
      {data.appId && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Node Name
          </label>
          <input
            type="text"
            value={nodeName}
            onChange={(e) => {
              const newNodeName = e.target.value;
              setNodeName(newNodeName);
              onUpdate(nodeId, { nodeName: newNodeName });
            }}
            className="w-full p-2 border rounded-md border-gray-300"
            placeholder={data.appName || 'Enter node name'}
          />
          <p className="text-xs text-gray-500 mt-1">
            Custom name to identify this node. Defaults to app name if left empty.
          </p>
        </div>
      )}

      {/* Action Selection (only if app is selected) */}
      {selectedApp && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Action
          </label>
          <select
            value={selectedAction?.id || ''}
            onChange={(e) => handleActionSelect(e.target.value)}
            className="w-full p-2 border rounded-md border-gray-300"
          >
            <option value="">Select an action</option>
            {selectedApp.actions.map(action => (
              <option key={action.id} value={action.id}>{action.name}</option>
            ))}
          </select>
          {selectedAction && (
            <p className="text-xs text-gray-500 mt-1">{selectedAction.description}</p>
          )}
        </div>
      )}

      {/* Authentication Configuration (if app has auth) */}
      {selectedApp?.defaultAuthType && selectedApp.defaultAuthType !== 'none' && (
        <div className="mb-6 p-3 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium mb-2">Authentication</h3>
          {renderAuthConfig()}
        </div>
      )}

      {/* Input Configuration (only if action is selected) */}
      {selectedAction && (
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Inputs</h3>
          {selectedAction.inputs.map(input => renderInputField(input))}
        </div>
      )}

      {/* Output Schema (only if action is selected) */}
      {selectedAction && (
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Output</h3>
          <div className="p-3 bg-gray-50 rounded-md">
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(selectedAction.outputSchema, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Validation Button */}
      <div className="mt-6">
        <button
          onClick={() => {
            const isValid = validateConfig();
            if (isValid) {
              alert('Configuration is valid!');
            }
          }}
          className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Validate Configuration
        </button>
      </div>
    </div>
  );
};

export default AppNodeConfigPanel;
