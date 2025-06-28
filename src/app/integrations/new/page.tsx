"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppIcon from "@/src/components/AppIcon";

interface App {
  id: string;
  name: string;
  type: string;
  icon?: string;
  description?: string;
  guide?: string;
  configFields: {
    name: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
    description?: string;
  }[];
}

interface AppFinding {
  id: string;
  key: string;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  type: string;
}

interface Action {
  id: string;
  name: string;
  description: string;
}

// State for security findings and actions will be populated from the API

// Define steps for the multi-form process
enum FormStep {
  SELECT_APP = 0,
  CONFIGURE_INTEGRATION = 1
}

export default function NewIntegrationPage() {
  const router = useRouter();

  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated: () => router.push('/login?redirect=/integrations/new'),
  });

  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState<FormStep>(FormStep.SELECT_APP);
  const [showSidebar, setShowSidebar] = useState(false);

  // Handle click outside sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if the click is outside the sidebar
      if (showSidebar && !target.closest('.sidebar-content') && !target.closest('[data-app-type-card]')) {
        setShowSidebar(false);
      }
    };

    // Add event listener when sidebar is shown
    if (showSidebar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSidebar]);

  // Form state
  const [name, setName] = useState("");
  const [selectedAppId, setSelectedAppId] = useState("");
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // App details state
  const [postureFindings, setPostureFindings] = useState<AppFinding[]>([]);
  const [billingFindings, setBillingFindings] = useState<AppFinding[]>([]);
  const [otherFindings, setOtherFindings] = useState<AppFinding[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [loadingAppDetails, setLoadingAppDetails] = useState(false);
  const [appDetailsError, setAppDetailsError] = useState<string | null>(null);

  // Fetch apps
  useEffect(() => {
    // if (!session?.user) {
    //   router.push('/?redirect=/integrations/new');
    //   return;
    // }

    const fetchApps = async () => {
      try {
        const response = await fetch('/api/apps');
        if (!response.ok) {
          throw new Error('Failed to fetch apps');
        }
        const data = await response.json();
        setApps(data.apps || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching apps:', err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.isSuperUser) {
      fetchApps();
    } else {
      setLoading(false);
    }
  }, [session, router]);

  // Get the selected app
  const selectedApp = apps.find(app => app.id === selectedAppId);

  // Fetch app details (app findings and actions)
  const fetchAppDetails = async (appId: string) => {
    setLoadingAppDetails(true);
    setAppDetailsError(null);

    try {
      const response = await fetch(`/api/apps/details?appId=${appId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch app details');
      }

      const data = await response.json();

      // Separate app findings by type
      const allFindings = data.appFindings || [];
      const posture = allFindings.filter(finding => finding.type === 'posture');
      const billing = allFindings.filter(finding => finding.type === 'billing');
      const other = allFindings.filter(finding => finding.type !== 'posture' && finding.type !== 'billing');

      setPostureFindings(posture);
      setBillingFindings(billing);
      setOtherFindings(other);

      setActions(data.actions || []);
    } catch (err) {
      setAppDetailsError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching app details:', err);
    } finally {
      setLoadingAppDetails(false);
    }
  };

  // Handle app selection
  const handleAppSelect = (appId: string) => {
    setSelectedAppId(appId);

    // Reset config values when app changes
    setConfigValues({});
    setFormErrors({});

    // Fetch app details
    fetchAppDetails(appId);

    // Show sidebar with details
    setShowSidebar(true);
  };

  // Handle app confirmation
  const handleAppConfirm = () => {
    setCurrentStep(FormStep.CONFIGURE_INTEGRATION);
    setShowSidebar(false);
  };

  // Handle back button
  const handleBack = () => {
    if (currentStep === FormStep.CONFIGURE_INTEGRATION) {
      setCurrentStep(FormStep.SELECT_APP);
      setShowSidebar(true);
    }
  };

  // Handle config field change
  const handleConfigChange = (fieldName: string, value: string) => {
    setConfigValues(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear error for this field if it exists
    if (formErrors[fieldName]) {
      setFormErrors(prev => {
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

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Integration name is required";
    }

    if (!selectedAppId) {
      errors.app = "Please select an app";
    }

    // Validate config fields
    if (selectedApp) {
      selectedApp.configFields.forEach(field => {
        if (field.required && !configValues[field.name]) {
          errors[field.name] = `${field.label} is required`;
        }
      });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          appId: selectedAppId,
          config: configValues,
          isEnabled: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create integration');
      }

      // Redirect to integrations page on success
      router.push('/integrations');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error creating integration:', err);
    } finally {
      setSubmitting(false);
    }
  };

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
        <div className="flex items-center mb-4">
          <Link href="/integrations" className="text-blue-500 hover:underline mr-2">
            ← Back to Integrations
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-4">Add an integration</h1>
        <p>Loading app types...</p>
      </div>
    );
  }

  // Render app selection grid (Step 1)
  const renderAppGrid = () => {
    return (
      <div>
        <span className="text-xl font-semibold mb-4">Confirm your SaaS account’s permissions before adding your application.</span>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map((app) => (
            <div 
              key={app.id}
              data-app-card
              className={`border rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                selectedAppId === app.id && showSidebar ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
              }`}
              onClick={() => handleAppSelect(app.id)}
            >
              <div className="flex items-center mb-2">
                <AppIcon iconName={app.icon} size={36} className="mr-3" />
                <h3 className="text-lg font-semibold">{app.name}</h3>
              </div>
              <p className="text-sm text-gray-600">{app.description || `Integration with ${app.name}`}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render sidebar with actions and app findings (Step 2)
  const renderSidebar = () => {
    if (!selectedApp) return null;

    return (
      <div 
        className="sidebar-content fixed top-0 right-0 h-full w-80 bg-white shadow-lg p-4 overflow-y-auto" 
        style={{ 
          zIndex: 1000,
          transition: 'transform 0.3s ease-in-out',
          transform: showSidebar ? 'translateX(0)' : 'translateX(100%)'
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <AppIcon iconName={selectedApp.icon} size={24} className="mr-2" />
            <h2 className="text-xl font-semibold">{selectedApp.name}</h2>
          </div>
          <button 
            onClick={() => setShowSidebar(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <hr className="border-gray-200 mb-4" />

        <div className="mb-4">
          <h3 className="text-lg font-bold mb-2">About</h3>
          <p className="text-sm text-gray-600">{selectedApp.description || `Integration with ${selectedApp.name}`}</p>
          {selectedApp.guide && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-blue-800">
                This integration requires specific setup. Please refer to the integration guide.
              </p>
              <a 
                href={`/integrations/guide/${selectedApp.guide}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-1 inline-block"
              >
                View {selectedApp.name} Integration Guide →
              </a>
            </div>
          )}
        </div>

        {loadingAppDetails ? (
          <div className="py-4 text-center">
            <p>Loading app details...</p>
          </div>
        ) : appDetailsError ? (
          <div className="py-4 text-center text-red-500">
            <p>Error: {appDetailsError}</p>
            <button 
              onClick={() => fetchAppDetails(selectedAppId)}
              className="mt-2 px-4 py-1 bg-blue-500 text-white rounded"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-2">Actions</h3>
              {actions.length === 0 ? (
                <p className="text-gray-500">No actions available</p>
              ) : (
                <ul className="space-y-2">
                  {actions.map(action => (
                    <li key={action.id} className="p-2 bg-gray-50 rounded">
                      <p className="font-medium">{action.name}</p>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-2">Posture Findings</h3>
              {postureFindings.length === 0 ? (
                  <p className="text-gray-500">No posture findings available</p>
              ) : (
              <ul className="space-y-2">
                {postureFindings.map(finding => (
                    <li key={finding.id} className="p-2 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-2"
                          style={{
                            backgroundColor:
                              finding.severity === 'critical' ? 'rgb(254, 204, 200)' :
                              finding.severity === 'high' ? 'rgb(251, 205, 165)' :
                              finding.severity === 'medium' ? 'rgb(185, 214, 255)' :
                              'rgb(223, 220, 249)'
                          }}
                        ></span>
                        <p className="font-medium">{finding.name}</p>
                        <span
                            className="ml-auto text-xs px-2 py-1 rounded-full"
                            style={{
                              backgroundColor:
                                  finding.severity === 'critical' ? 'rgb(254, 204, 200)' :
                                  finding.severity === 'high' ? 'rgb(251, 205, 165)' :
                                  finding.severity === 'medium' ? 'rgb(185, 214, 255)' :
                                  'rgb(223, 220, 249)',
                              color:
                                  finding.severity === 'critical' ? 'rgb(90, 8, 1)' :
                                  finding.severity === 'high' ? 'rgb(72, 35, 3)' :
                                  finding.severity === 'medium' ? 'rgb(0, 43, 103)' :
                                  'rgb(34, 23, 133)'
                            }}
                        >
                          {finding.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{finding.description}</p>
                    </li>
                ))}
              </ul>
              )}
            </div>

            {billingFindings.length != 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-2">Billing Findings</h3>
                <ul className="space-y-2">
                  {billingFindings.map(finding => (
                      <li key={finding.id} className="p-2 bg-gray-50 rounded">
                        <div className="flex items-center">
                            <span
                              className="inline-block w-2 h-2 rounded-full mr-2"
                              style={{
                                backgroundColor:
                                  finding.severity === 'critical' ? 'rgb(254, 204, 200)' :
                                  finding.severity === 'high' ? 'rgb(251, 205, 165)' :
                                  finding.severity === 'medium' ? 'rgb(185, 214, 255)' :
                                  'rgb(223, 220, 249)'
                              }}
                            ></span>
                          <p className="font-medium">{finding.name}</p>
                          <span
                            className="ml-auto text-xs px-2 py-1 rounded-full"
                            style={{
                              backgroundColor:
                                finding.severity === 'critical' ? 'rgb(254, 204, 200)' :
                                finding.severity === 'high' ? 'rgb(251, 205, 165)' :
                                finding.severity === 'medium' ? 'rgb(185, 214, 255)' :
                                'rgb(223, 220, 249)',
                              color:
                                finding.severity === 'critical' ? 'rgb(90, 8, 1)' :
                                finding.severity === 'high' ? 'rgb(72, 35, 3)' :
                                finding.severity === 'medium' ? 'rgb(0, 43, 103)' :
                                'rgb(34, 23, 133)'
                            }}
                          >
                            {finding.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{finding.description}</p>
                      </li>
                  ))}
                </ul>
              </div>
            )}

            {otherFindings.length != 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-2">Other Findings</h3>
                <ul className="space-y-2">
                  {otherFindings.map(finding => (
                      <li key={finding.id} className="p-2 bg-gray-50 rounded">
                        <div className="flex items-center">
                            <span
                                className="inline-block w-2 h-2 rounded-full mr-2"
                                style={{
                                  backgroundColor:
                                      finding.severity === 'critical' ? 'rgb(254, 204, 200)' :
                                          finding.severity === 'high' ? 'rgb(251, 205, 165)' :
                                              finding.severity === 'medium' ? 'rgb(185, 214, 255)' :
                                                  'rgb(223, 220, 249)'
                                }}
                            ></span>
                          <p className="font-medium">{finding.name}</p>
                          <span
                              className="ml-auto text-xs px-2 py-1 rounded-full"
                              style={{
                                backgroundColor:
                                    finding.severity === 'critical' ? 'rgb(254, 204, 200)' :
                                        finding.severity === 'high' ? 'rgb(251, 205, 165)' :
                                            finding.severity === 'medium' ? 'rgb(185, 214, 255)' :
                                                'rgb(223, 220, 249)',
                                color:
                                    finding.severity === 'critical' ? 'rgb(90, 8, 1)' :
                                        finding.severity === 'high' ? 'rgb(72, 35, 3)' :
                                            finding.severity === 'medium' ? 'rgb(0, 43, 103)' :
                                                'rgb(34, 23, 133)'
                              }}
                          >
                            {finding.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{finding.description}</p>
                      </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="mt-auto pt-4 border-t">
          <button
            onClick={handleAppConfirm}
            className="w-full px-4 py-2 rounded-md text-white"
            style={{ background: 'var(--primary-blue)' }}
            disabled={loadingAppDetails || !!appDetailsError}
          >
            Continue with {selectedApp.name}
          </button>
        </div>
      </div>
    );
  };

  // Render integration configuration form (Step 3)
  const renderConfigurationForm = () => {
    if (!selectedApp) return null;

    return (
      <form onSubmit={handleSubmit} className="max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Configure {selectedApp.name} Integration</h2>

        {/* Integration Name */}
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Integration Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full p-2 border rounded-md ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Enter integration name"
          />
          {formErrors.name && (
            <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
          )}
        </div>

        {/* Dynamic Config Fields */}
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Configuration</h3>
          {selectedApp.configFields.map((field) => (
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
                  className={`w-full p-2 border rounded-md ${formErrors[field.name] ? 'border-red-500' : 'border-gray-300'} ${field.type === 'password' ? 'pr-10' : ''}`}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
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
              {formErrors[field.name] && (
                <p className="text-red-500 text-sm mt-1">{formErrors[field.name]}</p>
              )}
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 border border-gray-300 rounded-md mr-2 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-md text-white"
            style={{ background: 'var(--primary-blue)' }}
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create Integration'}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="p-4">
      <div className="flex items-center mb-4">
        <Link href="/integrations" className="text-blue-500 hover:underline mr-2">
          ← Back to Integrations
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-4">Add an integration</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      {/* Multi-step form content */}
      <div className="relative">
        {currentStep === FormStep.SELECT_APP && renderAppGrid()}
        {currentStep === FormStep.CONFIGURE_INTEGRATION && renderConfigurationForm()}

        {/* Overlay for sidebar */}
        {selectedApp && (
          <div 
            className="fixed inset-0 bg-black" 
            style={{ 
              opacity: showSidebar ? 0.3 : 0, 
              visibility: showSidebar ? 'visible' : 'hidden',
              transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out',
              zIndex: 999 
            }}
          />
        )}

        {selectedApp && renderSidebar()}
      </div>
    </div>
  );
}
