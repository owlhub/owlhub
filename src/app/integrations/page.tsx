"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppIcon from "@/src/components/AppIcon";
import Popup from "@/src/components/Popup";

interface Integration {
  id: string;
  name: string;
  app: {
    name: string;
    icon?: string;
    configFields: {
      name: string;
      label: string;
      type: string;
      required: boolean;
      placeholder?: string;
      description?: string;
    }[];
  };
  isEnabled: boolean;
  config: Record<string, string>;
}

export default function IntegrationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated: () => router.push('/?redirect=/integrations'),
  });

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Confirmation dialog states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [confirmationIntegration, setConfirmationIntegration] = useState<Integration | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [configErrors, setConfigErrors] = useState<Record<string, string>>({});
  const [updatingConfig, setUpdatingConfig] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest('.menu-container')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  // Function to handle integration deletion
  const handleDeleteIntegration = async (integrationId: string) => {
    try {
      // API call to delete integration
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete integration');
      }

      // Update the UI by removing the deleted integration
      setIntegrations(integrations.filter(integration => integration.id !== integrationId));

      // Close the confirmation dialog
      setShowDeleteConfirm(false);
      setConfirmationIntegration(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while deleting');
      console.error('Error deleting integration:', err);
    }
  };

  // Function to handle integration status change
  const handleToggleStatus = async (integration: Integration) => {
    try {
      // API call to update integration status
      const response = await fetch(`/api/integrations/${integration.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isEnabled: !integration.isEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update integration status');
      }

      // Update the UI with the new status
      setIntegrations(integrations.map(item => 
        item.id === integration.id 
          ? { ...item, isEnabled: !item.isEnabled } 
          : item
      ));

      // Close the confirmation dialog
      setShowStatusConfirm(false);
      setConfirmationIntegration(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating');
      console.error('Error updating integration status:', err);
    }
  };

  // Function to handle opening the configuration modal
  const handleOpenConfigModal = (integration: Integration) => {
    setConfigValues(integration.config || {});
    setConfigErrors({});
    setConfirmationIntegration(integration);
    setShowConfigureModal(true);
    setOpenMenuId(null);
  };

  // Function to handle configuration field change
  const handleConfigChange = (fieldName: string, value: string) => {
    setConfigValues(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear error for this field if it exists
    if (configErrors[fieldName]) {
      setConfigErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Function to toggle password visibility
  const togglePasswordVisibility = (fieldName: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  // Validate configuration form
  const validateConfigForm = () => {
    const errors: Record<string, string> = {};

    if (confirmationIntegration?.app.configFields) {
      confirmationIntegration.app.configFields.forEach(field => {
        if (field.required && !configValues[field.name]) {
          errors[field.name] = `${field.label} is required`;
        }
      });
    }

    setConfigErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Function to handle updating integration configuration
  const handleUpdateConfig = async () => {
    if (!confirmationIntegration) return;

    if (!validateConfigForm()) {
      return;
    }

    setUpdatingConfig(true);

    try {
      // API call to update integration configuration
      const response = await fetch(`/api/integrations/${confirmationIntegration.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: configValues,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update integration configuration');
      }

      await response.json();

      // Update the UI with the new configuration
      setIntegrations(integrations.map(item => 
        item.id === confirmationIntegration.id 
          ? { ...item, config: configValues } 
          : item
      ));

      // Close the configuration modal
      setShowConfigureModal(false);
      setConfirmationIntegration(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating configuration');
      console.error('Error updating integration configuration:', err);
    } finally {
      setUpdatingConfig(false);
    }
  };

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const response = await fetch('/api/integrations');
        if (!response.ok) {
          throw new Error('Failed to fetch integrations');
        }
        const data = await response.json();
        setIntegrations(data.integrations || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching integrations:', err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.isSuperUser) {
      fetchIntegrations();
    } else {
      setLoading(false);
    }
  }, [session, router]);

  if (status === "loading") {
    return (
       <></>
    );
  }

  if (!session?.user?.isSuperUser) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        {/* Header with button */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Integrations</h1>
          <button 
            className="px-2 py-1 rounded-md text-white inline-block opacity-50 cursor-not-allowed"
            style={{ background: 'var(--primary-blue)' }}
            disabled
          >
            Add New Integration
          </button>
        </div>
        <p>Loading integrations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        {/* Header with button */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Integrations</h1>
          <Link 
            href="/integrations/new"
            className="px-2 py-1 rounded-md text-white inline-block"
            style={{ background: 'var(--primary-blue)' }}
          >
            Add New Integration
          </Link>
        </div>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Delete Confirmation Modal */}
      <Popup
        isOpen={showDeleteConfirm && !!confirmationIntegration}
        onClose={() => {
          setShowDeleteConfirm(false);
          setConfirmationIntegration(null);
        }}
        title="Confirm Deletion"
        buttons={[
          {
            label: "Cancel",
            onClick: () => {
              setShowDeleteConfirm(false);
              setConfirmationIntegration(null);
            },
            variant: "secondary"
          },
          {
            label: "Delete",
            onClick: () => confirmationIntegration && handleDeleteIntegration(confirmationIntegration.id),
            variant: "danger"
          }
        ]}
      >
        <p>
          Are you sure you want to delete the integration &quot;{confirmationIntegration?.name}&quot;? This action cannot be undone.
        </p>
      </Popup>

      {/* Status Change Confirmation Modal */}
      <Popup
        isOpen={showStatusConfirm && !!confirmationIntegration}
        onClose={() => {
          setShowStatusConfirm(false);
          setConfirmationIntegration(null);
        }}
        title="Confirm Status Change"
        buttons={[
          {
            label: "Cancel",
            onClick: () => {
              setShowStatusConfirm(false);
              setConfirmationIntegration(null);
            },
            variant: "secondary"
          },
          {
            label: confirmationIntegration?.isEnabled ? 'Disable' : 'Enable',
            onClick: () => confirmationIntegration && handleToggleStatus(confirmationIntegration),
            variant: "primary"
          }
        ]}
      >
        <p>
          Are you sure you want to {confirmationIntegration?.isEnabled ? 'disable' : 'enable'} the integration &quot;{confirmationIntegration?.name}&quot;?
        </p>
      </Popup>

      {/* Configuration Modal */}
      <Popup
        isOpen={showConfigureModal && !!confirmationIntegration}
        onClose={() => {
          setShowConfigureModal(false);
          setConfirmationIntegration(null);
        }}
        title={`Configure ${confirmationIntegration?.name}`}
        buttons={[
          {
            label: "Cancel",
            onClick: () => {
              setShowConfigureModal(false);
              setConfirmationIntegration(null);
            },
            variant: "secondary"
          },
          {
            label: updatingConfig ? "Updating..." : "Save Configuration",
            onClick: handleUpdateConfig,
            variant: "primary",
          }
        ]}
      >
        <div className="max-h-[60vh] overflow-y-auto">
          {confirmationIntegration?.app.configFields.map((field) => (
            <div key={field.name} className="mb-3">
              <label htmlFor={field.name} className="block text-sm font-medium mb-1">
                {field.label} {field.required && '*'}
              </label>
              <div className="relative">
                <input
                  type={field.type === 'password' && !visiblePasswords[field.name] ? 'password' : 'text'}
                  id={field.name}
                  value={configValues[field.name] || ''}
                  onChange={(e) => handleConfigChange(field.name, e.target.value)}
                  className={`w-full p-2 border rounded-md ${configErrors[field.name] ? 'border-red-500' : 'border-gray-300'} ${field.type === 'password' ? 'pr-10' : ''}`}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  disabled={updatingConfig}
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800"
                    onClick={() => togglePasswordVisibility(field.name)}
                    tabIndex={-1}
                  >
                    {visiblePasswords[field.name] ? (
                      <span className="text-sm">👁️</span>
                    ) : (
                      <span className="text-sm">👁️‍🗨️</span>
                    )}
                  </button>
                )}
              </div>
              {field.description && (
                <p className="text-xs text-gray-500 mt-1">{field.description}</p>
              )}
              {configErrors[field.name] && (
                <p className="text-red-500 text-sm mt-1">{configErrors[field.name]}</p>
              )}
            </div>
          ))}
        </div>
      </Popup>

      {/* Header with button */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <Link 
          href="/integrations/new"
          className="px-2 py-1 rounded-md text-white inline-block"
          style={{ background: 'var(--primary-blue)' }}
        >
          Add New Integration
        </Link>
      </div>

      {integrations.length === 0 ? (
        <p>No integrations found. Add your first integration to get started.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration) => (
            <div 
              key={integration.id} 
              className="border rounded-lg p-4 shadow-sm"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <AppIcon iconName={integration.app.icon} size={28} className="mr-2" />
                  <h3 className="text-lg font-semibold">{integration.name}</h3>
                </div>
                <div className="relative menu-container">
                  <button 
                    onClick={() => setOpenMenuId(openMenuId === integration.id ? null : integration.id)}
                    className="p-1 rounded-full transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]"
                    aria-label="Configure integration"
                  >
                    <span className="text-xl leading-none">⋮</span>
                  </button>

                  {openMenuId === integration.id && (
                    <div 
                      className="absolute right-0 mt-1 w-48 rounded-md shadow-lg z-50 menu-container"
                      style={{ 
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div className="py-1">
                        <button 
                          onClick={() => {
                            handleOpenConfigModal(integration);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]"
                          style={{ color: 'var(--foreground)' }}
                        >
                          Configure
                        </button>
                        <button 
                          onClick={() => {
                            // Show status change confirmation
                            setConfirmationIntegration(integration);
                            setShowStatusConfirm(true);
                            setOpenMenuId(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]"
                          style={{ color: 'var(--foreground)' }}
                        >
                          {integration.isEnabled ? 'Disable' : 'Enable'}
                        </button>
                        <button 
                          onClick={() => {
                            // Show delete confirmation
                            setConfirmationIntegration(integration);
                            setShowDeleteConfirm(true);
                            setOpenMenuId(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-[rgba(254,204,200,0.9)] hover:text-[rgba(90,8,1)]"
                          style={{ color: 'var(--error)' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm mb-2">Type: {integration.app.name}</p>
              <div className="flex items-center">
                <span
                    className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        integration.isEnabled ? 'bg-green-500' : 'bg-red-500'
                    }`}
                ></span>
                <span className="text-sm">{integration.isEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
