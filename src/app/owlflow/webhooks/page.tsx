"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Popup from "@/components/Popup";

interface Flow {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  webhooks: {
    id: string;
    name: string;
  }[];
  parentFlow?: {
    id: string;
    name: string;
  };
  _count: {
    childFlows: number;
    flowRuns: number;
    queueItems: number;
  };
}

interface Webhook {
  id: string;
  name: string;
  description?: string;
  token: string;
  isEnabled: boolean;
  flows: {
    id: string;
    name: string;
    isEnabled: boolean;
  }[];
  _count: {
    events: number;
  };
}

export default function WebhooksPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated: () => router.push('/?redirect=/owlflow/webhooks'),
  });

  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Webhook creation states
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookName, setWebhookName] = useState('');
  const [webhookDescription, setWebhookDescription] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [webhookErrors, setWebhookErrors] = useState<Record<string, string>>({});

  // Confirmation dialog states
  const [confirmationWebhook, setConfirmationWebhook] = useState<Webhook | null>(null);
  const [showWebhookDeleteConfirm, setShowWebhookDeleteConfirm] = useState(false);
  const [showWebhookStatusConfirm, setShowWebhookStatusConfirm] = useState(false);
  const [webhookOpenMenuId, setWebhookOpenMenuId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [copiedWebhookId, setCopiedWebhookId] = useState<string | null>(null);
  const [newlyResetTokens, setNewlyResetTokens] = useState<Record<string, string>>({});

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (webhookOpenMenuId && !(event.target as Element).closest('.webhook-menu-container')) {
        setWebhookOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [webhookOpenMenuId]);

  // Clear copy success message after 2 seconds
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => {
        setCopySuccess(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  // Clear copied webhook ID after 2 seconds
  useEffect(() => {
    if (copiedWebhookId) {
      const timer = setTimeout(() => {
        setCopiedWebhookId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedWebhookId]);


  // Function to handle webhook deletion
  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      // API call to delete webhook
      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete webhook');
      }

      // Update the UI by removing the deleted webhook
      setWebhooks(webhooks.filter(webhook => webhook.id !== webhookId));

      // Close the confirmation dialog
      setShowWebhookDeleteConfirm(false);
      setConfirmationWebhook(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while deleting');
      console.error('Error deleting webhook:', err);
    }
  };

  // Function to handle webhook status change
  const handleToggleWebhookStatus = async (webhook: Webhook) => {
    try {
      // API call to update webhook status
      const response = await fetch(`/api/webhooks/${webhook.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isEnabled: !webhook.isEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update webhook status');
      }

      // Update the UI with the new status
      setWebhooks(webhooks.map(item => 
        item.id === webhook.id 
          ? { ...item, isEnabled: !item.isEnabled } 
          : item
      ));

      // Close the confirmation dialog
      setShowWebhookStatusConfirm(false);
      setConfirmationWebhook(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating');
      console.error('Error updating webhook status:', err);
    }
  };

  // Function to copy webhook token to clipboard
  const copyTokenToClipboard = (token: string, webhookId: string) => {
    navigator.clipboard.writeText(token)
      .then(() => {
        setCopySuccess('Token copied to clipboard!');
        setCopiedWebhookId(webhookId);
      })
      .catch(err => {
        console.error('Failed to copy token: ', err);
        setError('Failed to copy token to clipboard');
      });
  };


  // Validate webhook form
  const validateWebhookForm = () => {
    const errors: Record<string, string> = {};

    if (!webhookName.trim()) {
      errors.name = "Webhook name is required";
    }

    setWebhookErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Function to handle webhook creation
  const handleCreateWebhook = async () => {
    if (!validateWebhookForm()) {
      return;
    }

    setCreatingWebhook(true);

    try {
      // API call to create webhook
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: webhookName,
          description: webhookDescription,
          isEnabled: webhookEnabled
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create webhook');
      }

      const data = await response.json();

      // Add the new webhook to the state
      setWebhooks([data.webhook, ...webhooks]);

      // Store the new token to display it
      setNewlyResetTokens(prev => ({
        ...prev,
        [data.webhook.id]: data.webhook.token
      }));

      // Reset form and close modal
      setWebhookName('');
      setWebhookDescription('');
      setWebhookEnabled(true);
      setShowWebhookModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error creating webhook:', err);
    } finally {
      setCreatingWebhook(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch webhooks
        const webhooksResponse = await fetch('/api/webhooks');
        if (!webhooksResponse.ok) {
          throw new Error('Failed to fetch webhooks');
        }
        const webhooksData = await webhooksResponse.json();

        setWebhooks(webhooksData.webhooks || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.isSuperUser) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [session, router]);

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

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <div className="flex space-x-2">
            <button 
              className="px-2 py-1 rounded-md text-white inline-block opacity-50 cursor-not-allowed"
              style={{ background: 'var(--primary-blue)' }}
              disabled
            >
              Create Webhook
            </button>
          </div>
        </div>
        <p>Loading webhooks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <div className="flex space-x-2">
            <button 
              onClick={() => setShowWebhookModal(true)}
              className="px-2 py-1 rounded-md text-white inline-block"
              style={{ background: 'var(--primary-blue)' }}
            >
              Create Webhook
            </button>
          </div>
        </div>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">

      {/* Webhook Delete Confirmation Modal */}
      <Popup
        isOpen={showWebhookDeleteConfirm && !!confirmationWebhook}
        onClose={() => {
          setShowWebhookDeleteConfirm(false);
          setConfirmationWebhook(null);
        }}
        title="Confirm Webhook Deletion"
        buttons={[
          {
            label: "Cancel",
            onClick: () => {
              setShowWebhookDeleteConfirm(false);
              setConfirmationWebhook(null);
            },
            variant: "secondary"
          },
          {
            label: "Delete",
            onClick: () => confirmationWebhook && handleDeleteWebhook(confirmationWebhook.id),
            variant: "danger"
          }
        ]}
      >
        <p>
          Are you sure you want to delete the webhook &quot;{confirmationWebhook?.name}&quot;? This action cannot be undone.
        </p>
        <p className="mt-2 text-sm text-red-600">
          Warning: Deleting this webhook will remove all associated events and may affect any integrations that use it.
        </p>
      </Popup>

      {/* Webhook Status Change Confirmation Modal */}
      <Popup
        isOpen={showWebhookStatusConfirm && !!confirmationWebhook}
        onClose={() => {
          setShowWebhookStatusConfirm(false);
          setConfirmationWebhook(null);
        }}
        title="Confirm Webhook Status Change"
        buttons={[
          {
            label: "Cancel",
            onClick: () => {
              setShowWebhookStatusConfirm(false);
              setConfirmationWebhook(null);
            },
            variant: "secondary"
          },
          {
            label: confirmationWebhook?.isEnabled ? 'Disable' : 'Enable',
            onClick: () => confirmationWebhook && handleToggleWebhookStatus(confirmationWebhook),
            variant: "primary"
          }
        ]}
      >
        <p>
          Are you sure you want to {confirmationWebhook?.isEnabled ? 'disable' : 'enable'} the webhook &quot;{confirmationWebhook?.name}&quot;?
        </p>
        {confirmationWebhook?.isEnabled && (
          <p className="mt-2 text-sm text-amber-600">
            Warning: Disabling this webhook will prevent it from receiving any new events.
          </p>
        )}
      </Popup>


      {/* Webhook Creation Modal */}
      <Popup
        isOpen={showWebhookModal}
        onClose={() => {
          setShowWebhookModal(false);
          setWebhookName('');
          setWebhookDescription('');
          setWebhookEnabled(true);
          setWebhookErrors({});
        }}
        title="Create Webhook"
        buttons={[
          {
            label: "Cancel",
            onClick: () => {
              setShowWebhookModal(false);
              setWebhookName('');
              setWebhookDescription('');
              setWebhookEnabled(true);
              setWebhookErrors({});
            },
            variant: "secondary"
          },
          {
            label: creatingWebhook ? "Creating..." : "Create Webhook",
            onClick: handleCreateWebhook,
            variant: "primary",
            disabled: creatingWebhook
          }
        ]}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="webhookName" className="block text-sm font-medium mb-1">
              Name *
            </label>
            <input
              type="text"
              id="webhookName"
              value={webhookName}
              onChange={(e) => {
                setWebhookName(e.target.value);
                if (webhookErrors.name) {
                  setWebhookErrors({ ...webhookErrors, name: '' });
                }
              }}
              className={`w-full p-2 border rounded-md ${webhookErrors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter webhook name"
              disabled={creatingWebhook}
            />
            {webhookErrors.name && (
              <p className="text-red-500 text-sm mt-1">{webhookErrors.name}</p>
            )}
          </div>
          <div>
            <label htmlFor="webhookDescription" className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              id="webhookDescription"
              value={webhookDescription}
              onChange={(e) => setWebhookDescription(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Enter webhook description"
              rows={3}
              disabled={creatingWebhook}
            />
          </div>
          <div className="flex items-center">
            <label htmlFor="webhookEnabled" className="block text-sm font-medium mr-2">
              Enabled
            </label>
            <button
              type="button"
              onClick={() => setWebhookEnabled(!webhookEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                webhookEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={webhookEnabled}
              id="webhookEnabled"
              disabled={creatingWebhook}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  webhookEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </Popup>

      {/* Header with buttons */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Webhooks</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => setShowWebhookModal(true)}
            className="px-2 py-1 rounded-md text-white inline-block"
            style={{ background: 'var(--primary-blue)' }}
          >
            Create Webhook
          </button>
        </div>
      </div>

      {/* Webhooks Section */}
      <div className="mb-8">
        {webhooks.length === 0 ? (
          <p>No webhooks found. Create your first webhook to get started.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {webhooks.map((webhook) => (
              <div 
                key={webhook.id} 
                className="border rounded-lg p-4 shadow-sm relative"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <Link href={`/owlflow/webhooks/${webhook.id}`}>
                    <h3 className="text-lg font-semibold hover:text-blue-600">{webhook.name}</h3>
                  </Link>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 text-xs rounded-full mr-2 ${webhook.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {webhook.isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <div className="relative webhook-menu-container">
                      <button 
                        onClick={() => setWebhookOpenMenuId(webhookOpenMenuId === webhook.id ? null : webhook.id)}
                        className="p-1 rounded-full transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]"
                        aria-label="Webhook options"
                      >
                        <span className="text-xl leading-none">⋮</span>
                      </button>

                      {webhookOpenMenuId === webhook.id && (
                        <div 
                          className="absolute right-0 mt-1 w-48 rounded-md shadow-lg z-50 webhook-menu-container"
                          style={{ 
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                          }}
                        >
                          <div className="py-1">
                            <Link 
                              href={`/owlflow/webhooks/${webhook.id}`}
                              className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]"
                              style={{ color: 'var(--foreground)' }}
                            >
                              View Details
                            </Link>
                            {newlyResetTokens[webhook.id] && (
                              <button 
                                onClick={() => copyTokenToClipboard(newlyResetTokens[webhook.id], webhook.id)}
                                className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]"
                                style={{ color: 'var(--foreground)' }}
                              >
                                Copy Token
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                setConfirmationWebhook(webhook);
                                setShowWebhookStatusConfirm(true);
                                setWebhookOpenMenuId(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]"
                              style={{ color: 'var(--foreground)' }}
                            >
                              {webhook.isEnabled ? 'Disable' : 'Enable'}
                            </button>
                            <button 
                              onClick={() => {
                                setConfirmationWebhook(webhook);
                                setShowWebhookDeleteConfirm(true);
                                setWebhookOpenMenuId(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {webhook.description && (
                  <p className="text-sm text-gray-600 mb-2">{webhook.description}</p>
                )}
                <div className="text-sm">
                  {newlyResetTokens[webhook.id] && (
                    <>
                      <p className="flex items-center">
                        Token: 
                        <span className="font-mono text-xs ml-1 bg-yellow-100 p-1 rounded">{newlyResetTokens[webhook.id]}</span>
                        <button 
                          onClick={() => copyTokenToClipboard(newlyResetTokens[webhook.id], webhook.id)}
                          className="ml-2 text-blue-600 hover:text-blue-800 text-xs relative"
                          title="Copy new token to clipboard"
                        >
                          Copy
                          {copiedWebhookId === webhook.id && (
                            <span className="absolute -top-8 left-0 bg-green-100 text-green-800 px-2 py-1 rounded text-xs whitespace-nowrap">
                              Copied to clipboard!
                            </span>
                          )}
                        </button>
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        This token is only shown once. Make sure to copy it now!
                      </p>
                    </>
                  )}
                  <p>Connected Flows: {webhook.flows?.length || 0}</p>
                  <p>Events: {webhook._count.events}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
