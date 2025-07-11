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

export default function FlowsPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated: () => router.push('/?redirect=/owlflow/flows'),
  });

  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showAddFlowMenu, setShowAddFlowMenu] = useState(false);

  // Confirmation dialog states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [confirmationFlow, setConfirmationFlow] = useState<Flow | null>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest('.menu-container')) {
        setOpenMenuId(null);
      }
      if (showAddFlowMenu && !(event.target as Element).closest('.add-flow-menu-container')) {
        setShowAddFlowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId, showAddFlowMenu]);

  // Function to handle flow deletion
  const handleDeleteFlow = async (flowId: string) => {
    try {
      // API call to delete flow
      const response = await fetch(`/api/flows/${flowId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete flow');
      }

      // Update the UI by removing the deleted flow
      setFlows(flows.filter(flow => flow.id !== flowId));

      // Close the confirmation dialog
      setShowDeleteConfirm(false);
      setConfirmationFlow(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while deleting');
      console.error('Error deleting flow:', err);
    }
  };

  // Function to handle flow status change
  const handleToggleStatus = async (flow: Flow) => {
    try {
      // API call to update flow status
      const response = await fetch(`/api/flows/${flow.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isEnabled: !flow.isEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update flow status');
      }

      // Update the UI with the new status
      setFlows(flows.map(item => 
        item.id === flow.id 
          ? { ...item, isEnabled: !item.isEnabled } 
          : item
      ));

      // Close the confirmation dialog
      setShowStatusConfirm(false);
      setConfirmationFlow(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating');
      console.error('Error updating flow status:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch flows
        const flowsResponse = await fetch('/api/flows');
        if (!flowsResponse.ok) {
          throw new Error('Failed to fetch flows');
        }
        const flowsData = await flowsResponse.json();

        setFlows(flowsData.flows || []);
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
          <h1 className="text-2xl font-bold">Flows</h1>
          <div className="flex space-x-2">
            <button 
              className="px-2 py-1 rounded-md text-white inline-flex items-center opacity-50 cursor-not-allowed"
              style={{ background: 'var(--primary-blue)' }}
              disabled
            >
              Add New Flow
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        <p>Loading flows...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Flows</h1>
          <div className="flex space-x-2 relative add-flow-menu-container">
            <button 
              onClick={() => setShowAddFlowMenu(!showAddFlowMenu)}
              className="px-2 py-1 rounded-md text-white inline-flex items-center"
              style={{ background: 'var(--primary-blue)' }}
            >
              Add New Flow
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAddFlowMenu && (
              <div 
                className="absolute right-0 mt-1 w-48 rounded-md shadow-lg z-50 add-flow-menu-container"
                style={{ 
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  top: '100%'
                }}
              >
                <div className="py-1">
                  <Link 
                    href="/owlflow/flows/new"
                    className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]"
                    style={{ color: 'var(--foreground)' }}
                    onClick={() => setShowAddFlowMenu(false)}
                  >
                    Form Editor
                  </Link>
                  <Link 
                    href="/owlflow/flows/canvas"
                    className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]"
                    style={{ color: 'var(--foreground)' }}
                    onClick={() => setShowAddFlowMenu(false)}
                  >
                    Canvas Editor
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Delete Confirmation Modal */}
      <Popup
        isOpen={showDeleteConfirm && !!confirmationFlow}
        onClose={() => {
          setShowDeleteConfirm(false);
          setConfirmationFlow(null);
        }}
        title="Confirm Deletion"
        buttons={[
          {
            label: "Cancel",
            onClick: () => {
              setShowDeleteConfirm(false);
              setConfirmationFlow(null);
            },
            variant: "secondary"
          },
          {
            label: "Delete",
            onClick: () => confirmationFlow && handleDeleteFlow(confirmationFlow.id),
            variant: "danger"
          }
        ]}
      >
        <p>
          Are you sure you want to delete the flow &quot;{confirmationFlow?.name}&quot;? This action cannot be undone.
        </p>
      </Popup>

      {/* Status Change Confirmation Modal */}
      <Popup
        isOpen={showStatusConfirm && !!confirmationFlow}
        onClose={() => {
          setShowStatusConfirm(false);
          setConfirmationFlow(null);
        }}
        title="Confirm Status Change"
        buttons={[
          {
            label: "Cancel",
            onClick: () => {
              setShowStatusConfirm(false);
              setConfirmationFlow(null);
            },
            variant: "secondary"
          },
          {
            label: confirmationFlow?.isEnabled ? 'Disable' : 'Enable',
            onClick: () => confirmationFlow && handleToggleStatus(confirmationFlow),
            variant: "primary"
          }
        ]}
      >
        <p>
          Are you sure you want to {confirmationFlow?.isEnabled ? 'disable' : 'enable'} the flow &quot;{confirmationFlow?.name}&quot;?
        </p>
      </Popup>

      {/* Header with buttons */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Flows</h1>
        <div className="flex space-x-2 relative add-flow-menu-container">
          <button 
            onClick={() => setShowAddFlowMenu(!showAddFlowMenu)}
            className="px-2 py-1 rounded-md text-white inline-flex items-center"
            style={{ background: 'var(--primary-blue)' }}
          >
            Add New Flow
            <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAddFlowMenu && (
            <div 
              className="absolute right-0 mt-1 w-48 rounded-md shadow-lg z-50 add-flow-menu-container"
              style={{ 
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                top: '100%'
              }}
            >
              <div className="py-1">
                <Link 
                  href="/owlflow/flows/new"
                  className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]"
                  style={{ color: 'var(--foreground)' }}
                  onClick={() => setShowAddFlowMenu(false)}
                >
                  Form Editor
                </Link>
                <Link 
                  href="/owlflow/flows/canvas"
                  className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]"
                  style={{ color: 'var(--foreground)' }}
                  onClick={() => setShowAddFlowMenu(false)}
                >
                  Canvas Editor
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flows Section */}
      <div>
        {flows.length === 0 ? (
          <p>No flows found. Add your first flow to get started.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flows.map((flow) => (
              <div 
                key={flow.id} 
                className="border rounded-lg p-4 shadow-sm"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{flow.name}</h3>
                  <div className="relative menu-container">
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === flow.id ? null : flow.id)}
                      className="p-1 rounded-full transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]"
                      aria-label="Configure flow"
                    >
                      <span className="text-xl leading-none">⋮</span>
                    </button>

                    {openMenuId === flow.id && (
                      <div 
                        className="absolute right-0 mt-1 w-48 rounded-md shadow-lg z-50 menu-container"
                        style={{ 
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <div className="py-1">
                          <Link 
                            href={`/owlflow/flows/${flow.id}`}
                            className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]"
                            style={{ color: 'var(--foreground)' }}
                          >
                            View Details
                          </Link>
                          <button 
                            onClick={() => {
                              setConfirmationFlow(flow);
                              setShowStatusConfirm(true);
                              setOpenMenuId(null);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]"
                            style={{ color: 'var(--foreground)' }}
                          >
                            {flow.isEnabled ? 'Disable' : 'Enable'}
                          </button>
                          <button 
                            onClick={() => {
                              setConfirmationFlow(flow);
                              setShowDeleteConfirm(true);
                              setOpenMenuId(null);
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
                {flow.description && (
                  <p className="text-sm text-gray-600 mb-2">{flow.description}</p>
                )}
                <div className="flex items-center mb-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${flow.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {flow.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  {flow.parentFlow && (
                    <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      Child Flow
                    </span>
                  )}
                  {flow.webhooks.length > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                      Webhook Triggered
                    </span>
                  )}
                </div>
                <div className="text-sm">
                  {flow.parentFlow && (
                    <p>Parent: {flow.parentFlow.name}</p>
                  )}
                  {flow.webhooks.length > 0 && (
                    <p>Webhooks: {flow.webhooks.map(w => w.name).join(', ')}</p>
                  )}
                  <p>Child Flows: {flow._count.childFlows}</p>
                  <p>Runs: {flow._count.flowRuns}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
