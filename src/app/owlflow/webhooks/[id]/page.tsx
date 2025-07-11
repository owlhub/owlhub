"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Popup from "@/components/Popup";
import Table from "@/components/Table";

interface WebhookEvent {
  id: string;
  status: string;
  createdAt: string;
}

interface Flow {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
}

interface Webhook {
  id: string;
  name: string;
  description?: string;
  token: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  flows: Flow[];
  events: WebhookEvent[];
  _count: {
    events: number;
  };
}

export default function WebhookDetailPage() {
  const router = useRouter();
  const params = useParams();
  const webhookId = params.id as string;

  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated: () => router.push(`/?redirect=/owlflow/webhooks/${webhookId}`),
  });

  const [webhook, setWebhook] = useState<Webhook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Token reset states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resettingToken, setResettingToken] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Status change states
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch webhook details
  useEffect(() => {
    const fetchWebhook = async () => {
      try {
        const response = await fetch(`/api/webhooks/${webhookId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch webhook details');
        }
        const data = await response.json();
        setWebhook(data.webhook);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching webhook details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.isSuperUser && webhookId) {
      fetchWebhook();
    } else if (!loading) {
      setLoading(false);
    }
  }, [session, webhookId, loading]);

  // Clear copied token state after 2 seconds
  useEffect(() => {
    if (copiedToken) {
      const timer = setTimeout(() => {
        setCopiedToken(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedToken]);

  // Clear copied URL state after 2 seconds
  useEffect(() => {
    if (copiedUrl) {
      const timer = setTimeout(() => {
        setCopiedUrl(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedUrl]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen && !(event.target as Element).closest('.dropdown-container')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Function to handle token reset
  const handleResetToken = async () => {
    setResettingToken(true);
    try {
      const response = await fetch(`/api/webhooks/${webhookId}/reset-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reset webhook token');
      }

      const data = await response.json();

      // Store the new token
      if (data.token) {
        setNewToken(data.token);

        // Update the webhook with the new token
        setWebhook(prev => prev ? {
          ...prev,
          token: data.token
        } : null);
      }

      // Close the confirmation dialog
      setShowResetConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while resetting token');
      console.error('Error resetting webhook token:', err);
    } finally {
      setResettingToken(false);
    }
  };

  // Function to handle webhook status change
  const handleToggleStatus = async () => {
    if (!webhook) return;

    setChangingStatus(true);
    try {
      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isEnabled: !webhook.isEnabled
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update webhook status');
      }

      await response.json();

      // Update the webhook with the new status
      setWebhook(prev => prev ? {
        ...prev,
        isEnabled: !prev.isEnabled
      } : null);

      // Close the confirmation dialog
      setShowStatusConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating webhook status');
      console.error('Error updating webhook status:', err);
    } finally {
      setChangingStatus(false);
    }
  };

  // Function to copy token to clipboard
  const copyTokenToClipboard = (token: string) => {
    navigator.clipboard.writeText(token)
      .then(() => {
        setCopiedToken(true);
      })
      .catch(err => {
        console.error('Failed to copy token: ', err);
        setError('Failed to copy token to clipboard');
      });
  };

  // Function to copy webhook URL to clipboard
  const copyUrlToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopiedUrl(true);
      })
      .catch(err => {
        console.error('Failed to copy URL: ', err);
        setError('Failed to copy URL to clipboard');
      });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

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
        <div className="flex items-center mb-4">
          <Link 
            href="/owlflow/webhooks"
            className="text-blue-600 hover:text-blue-800 mr-2"
          >
            ← Back to Webhooks
          </Link>
          <h1 className="text-2xl font-bold">Webhook Details</h1>
        </div>
        <p>Loading webhook details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="flex items-center mb-4">
          <Link 
            href="/owlflow/webhooks"
            className="text-blue-600 hover:text-blue-800 mr-2"
          >
            ← Back to Webhooks
          </Link>
          <h1 className="text-2xl font-bold">Webhook Details</h1>
        </div>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (!webhook) {
    return (
      <div className="p-4">
        <div className="flex items-center mb-4">
          <Link 
            href="/owlflow/webhooks"
            className="text-blue-600 hover:text-blue-800 mr-2"
          >
            ← Back to Webhooks
          </Link>
          <h1 className="text-2xl font-bold">Webhook Details</h1>
        </div>
        <p>Webhook not found.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Token Reset Confirmation Modal */}
      <Popup
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Reset Webhook Token"
        buttons={[
          {
            label: "Cancel",
            onClick: () => setShowResetConfirm(false),
            variant: "secondary"
          },
          {
            label: resettingToken ? "Resetting..." : "Reset Token",
            onClick: handleResetToken,
            variant: "primary",
            disabled: resettingToken
          }
        ]}
      >
        <p>
          Are you sure you want to reset the token for webhook &quot;{webhook.name}&quot;?
        </p>
        <p className="mt-2 text-sm text-amber-600">
          Warning: Resetting the token will invalidate the previous token. Any systems using the old token will need to be updated.
        </p>
        <p className="mt-2 text-sm">
          The new token will be displayed only once after reset. Make sure to copy it immediately.
        </p>
      </Popup>

      {/* Status Change Confirmation Modal */}
      <Popup
        isOpen={showStatusConfirm}
        onClose={() => setShowStatusConfirm(false)}
        title={webhook.isEnabled ? "Disable Webhook" : "Enable Webhook"}
        buttons={[
          {
            label: "Cancel",
            onClick: () => setShowStatusConfirm(false),
            variant: "secondary"
          },
          {
            label: changingStatus ? "Updating..." : (webhook.isEnabled ? "Disable" : "Enable"),
            onClick: handleToggleStatus,
            variant: "primary",
            disabled: changingStatus
          }
        ]}
      >
        <p>
          Are you sure you want to {webhook.isEnabled ? 'disable' : 'enable'} the webhook &quot;{webhook.name}&quot;?
        </p>
        {webhook.isEnabled && (
          <p className="mt-2 text-sm text-amber-600">
            Warning: Disabling this webhook will prevent it from receiving any new events.
          </p>
        )}
      </Popup>

      {/* Header with back button */}
      <div className="flex items-center mb-4">
        <Link 
          href="/owlflow/webhooks"
          className="text-blue-600 hover:text-blue-800 mr-2"
        >
          ← Back to Webhooks
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{webhook.name}</h1>
        <div className="relative dropdown-container">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="p-1 rounded-full transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]"
            aria-label="Webhook options"
          >
            <span className="text-xl leading-none">⋮</span>
          </button>

          {dropdownOpen && (
            <div 
              className="absolute right-0 mt-1 w-48 rounded-md shadow-lg z-50 dropdown-container"
              style={{ 
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div className="py-1">
                <button 
                  onClick={() => {
                    setShowStatusConfirm(true);
                    setDropdownOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]"
                  style={{ color: 'var(--foreground)' }}
                >
                  {webhook.isEnabled ? 'Disable' : 'Enable'}
                </button>
                <button 
                  onClick={() => {
                    setShowResetConfirm(true);
                    setDropdownOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]"
                  style={{ color: 'var(--foreground)' }}
                >
                  Reset Token
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Webhook Details Card */}
      <div 
        className="border rounded-lg p-6 shadow-sm mb-6"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold">{webhook.name}</h2>
            {webhook.description && (
              <p className="text-gray-600 mt-1">{webhook.description}</p>
            )}
          </div>
          <div className="flex items-center">
            <span className={`px-2 py-1 text-xs rounded-full ${webhook.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {webhook.isEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Webhook ID</h3>
            <p className="font-mono text-sm">{webhook.id}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Token</h3>
            <div className="flex items-center">
              {newToken ? (
                <>
                  <span className="font-mono text-xs bg-yellow-100 p-1 rounded">{newToken}</span>
                  <button 
                    onClick={() => copyTokenToClipboard(newToken)}
                    className="ml-2 text-blue-600 hover:text-blue-800 text-xs relative"
                    title="Copy token to clipboard"
                  >
                    Copy
                    {copiedToken && (
                      <span className="absolute -top-8 left-0 bg-green-100 text-green-800 px-2 py-1 rounded text-xs whitespace-nowrap">
                        Copied to clipboard!
                      </span>
                    )}
                  </button>
                  <p className="text-xs text-amber-600 ml-2">
                    This token is only shown once!
                  </p>
                </>
              ) : (
                <span className="font-mono text-xs">{webhook.token.substring(0, 8)}...</span>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Created At</h3>
            <p>{formatDate(webhook.createdAt)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
            <p>{formatDate(webhook.updatedAt)}</p>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Connected Flows</h3>
          {webhook.flows.length === 0 ? (
            <p className="text-sm text-gray-600">No flows connected to this webhook.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {webhook.flows.map(flow => (
                <Link 
                  key={flow.id}
                  href={`/owlflow/flows/${flow.id}`}
                  className={`px-2 py-1 text-xs rounded-full ${flow.isEnabled ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                >
                  {flow.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Webhook URL</h3>
          <div className="bg-gray-100 p-2 rounded font-mono text-sm break-all flex justify-between items-center">
            <span>{`${window.location.origin}/api/webhooks/receive/${webhook.id}`}</span>
            <button 
              onClick={() => copyUrlToClipboard(`${window.location.origin}/api/webhooks/receive/${webhook.id}`)}
              className="ml-2 text-blue-600 hover:text-blue-800 text-xs relative"
              title="Copy URL to clipboard"
            >
              Copy
              {copiedUrl && (
                <span className="absolute -top-8 right-0 bg-green-100 text-green-800 px-2 py-1 rounded text-xs whitespace-nowrap">
                  Copied to clipboard!
                </span>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Use this URL with the token in the &apos;OWLHUB-TOKEN&apos; header to send events to this webhook.
          </p>
        </div>
      </div>

      {/* Webhook Events Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Events</h2>
        {webhook.events.length === 0 ? (
          <p>No events have been received by this webhook yet.</p>
        ) : (
          <Table
            data={webhook.events}
            columns={[
              {
                header: "Event ID",
                accessor: "id",
                className: "font-mono",
                sortable: true,
              },
              {
                header: "Status",
                accessor: (event) => (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    event.status === 'completed' ? 'bg-green-100 text-green-800' : 
                    event.status === 'failed' ? 'bg-red-100 text-red-800' : 
                    event.status === 'processing' ? 'bg-blue-100 text-blue-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {event.status}
                  </span>
                ),
                sortKey: "status",
                sortable: true,
              },
              {
                header: "Received At",
                accessor: (event) => formatDate(event.createdAt),
                sortKey: "createdAt",
                sortable: true,
              },
              {
                header: "Actions",
                accessor: (event) => (
                  <Link 
                    href={`/owlflow/webhooks/${webhookId}/events/${event.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View Details
                  </Link>
                ),
              },
            ]}
            keyExtractor={(event) => event.id}
            defaultRowsPerPage={10}
            emptyMessage="No events have been received by this webhook yet."
          />
        )}
      </div>
    </div>
  );
}
