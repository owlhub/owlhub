"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Popup from "@/components/Popup";

// Define the types for the form fields
interface FlowFormData {
  name: string;
  description: string;
  isEnabled: boolean;
  flowType: string;
  webhookId?: string;
  parentFlowId?: string;
  conditions: Condition[];
}

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
  childFlowId?: string; // ID of the child flow to call if condition matches
}

interface Webhook {
  id: string;
  name: string;
}

interface Flow {
  id: string;
  name: string;
}

export default function NewFlowPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated: () => router.push('/?redirect=/owlflow/flows/new'),
  });

  // Form state
  const [formData, setFormData] = useState<FlowFormData>({
    name: '',
    description: '',
    isEnabled: true,
    flowType: 'standalone',
    conditions: []
  });

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Loading states
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data for dropdowns
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [parentFlows, setParentFlows] = useState<Flow[]>([]);

  // Confirmation dialog
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Generate a unique ID for new conditions
  const generateId = () => `condition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add a new condition
  const addCondition = () => {
    // Clear the conditions error when adding a new condition
    if (errors.conditions) {
      setErrors({ ...errors, conditions: '' });
    }

    // Create a default condition based on flow type
    let defaultCondition = { id: generateId(), field: '', operator: 'equals', value: '' };

    // For data validation flows, provide helpful defaults
    if (formData.flowType === 'data_validation') {
      defaultCondition = { 
        id: generateId(), 
        field: formData.conditions.length === 0 ? 'headers.content-type' : 'body.', 
        operator: 'equals', 
        value: formData.conditions.length === 0 ? 'application/json' : '' 
      };
    } else if (formData.flowType === 'gitlab') {
      defaultCondition = { 
        id: generateId(), 
        field: formData.conditions.length === 0 ? 'body.object_kind' : 'body.', 
        operator: 'equals', 
        value: '' 
      };
    } else if (formData.flowType === 'jira') {
      defaultCondition = { 
        id: generateId(), 
        field: formData.conditions.length === 0 ? 'body.webhookEvent' : 'body.', 
        operator: 'equals', 
        value: '' 
      };
    }

    setFormData({
      ...formData,
      conditions: [
        ...formData.conditions,
        defaultCondition
      ]
    });
  };

  // Remove a condition
  const removeCondition = (id: string) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter(condition => condition.id !== id)
    });
  };

  // Update a condition
  const updateCondition = (id: string, field: string, value: any) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.map(condition => 
        condition.id === id ? { ...condition, [field]: value } : condition
      )
    });
  };

  // Handle form field changes
  const handleChange = (field: keyof FlowFormData, value: any) => {
    // Clear error for the field being changed
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }

    // Special handling for flowType
    if (field === 'flowType') {
      const newFormData = { ...formData, [field]: value };

      // Reset related fields based on flow type
      if (value === 'standalone') {
        delete newFormData.webhookId;
        delete newFormData.parentFlowId;
      } else if (value === 'webhook') {
        delete newFormData.parentFlowId;
      } else if (value === 'child') {
        delete newFormData.webhookId;
      } else if (value === 'gitlab' || value === 'jira') {
        // These are specialized webhook flows, so they don't need parentFlowId
        delete newFormData.parentFlowId;
      } else if (value === 'data_validation') {
        // Data validation flows can be standalone or child flows
        delete newFormData.webhookId;
      }

      setFormData(newFormData);
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  // Validate the form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Flow name is required";
    }

    // Validate based on flow type
    if (formData.flowType === 'webhook' && !formData.webhookId) {
      newErrors.webhookId = "Please select a webhook";
    }

    if (formData.flowType === 'child' && !formData.parentFlowId) {
      newErrors.parentFlowId = "Please select a parent flow";
    }

    if ((formData.flowType === 'gitlab' || formData.flowType === 'jira') && !formData.webhookId) {
      newErrors.webhookId = `Please select a webhook for the ${formData.flowType === 'gitlab' ? 'GitLab' : 'Jira'} flow`;
    }

    if (formData.flowType === 'data_validation' && formData.conditions.length === 0) {
      newErrors.conditions = "Data validation flows require at least one condition";
    }

    // Check if at least one condition is provided
    if (formData.conditions.length === 0) {
      newErrors.conditions = "At least one condition is required";
    } else {
      // Validate conditions
      formData.conditions.forEach((condition, index) => {
        if (!condition.field) {
          newErrors[`condition-${index}-field`] = "Field is required";
        }
        if (!condition.value && condition.operator !== 'exists' && condition.operator !== 'not_exists') {
          newErrors[`condition-${index}-value`] = "Value is required";
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Prepare the data for submission
      const submitData = {
        ...formData,
        // Only include relevant fields based on flow type
        webhookId: formData.flowType === 'webhook' ? formData.webhookId : undefined,
        parentFlowId: formData.flowType === 'child' ? formData.parentFlowId : undefined,
        // Create config object from form data
        config: {
          flowType: formData.flowType,
          conditions: formData.conditions,
          // Include additional metadata based on flow type
          metadata: {
            isDataValidation: formData.flowType === 'data_validation',
            isGitLabFlow: formData.flowType === 'gitlab',
            isJiraFlow: formData.flowType === 'jira',
            validatesHeaders: formData.flowType === 'data_validation' && 
              formData.conditions.some(c => c.field.startsWith('headers.')),
            validatesBody: formData.flowType === 'data_validation' && 
              formData.conditions.some(c => c.field.startsWith('body.')),
          }
        },
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
        <h1 className="text-2xl font-bold">Create New Flow</h1>
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

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6" style={{ borderColor: 'var(--border-color)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-2">Basic Information</h2>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full p-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Enter flow name"
                disabled={submitting}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter flow description"
                rows={3}
                disabled={submitting}
              />
            </div>

            {/* Enabled Status */}
            <div className="flex items-center">
              <label htmlFor="isEnabled" className="block text-sm font-medium mr-2">
                Enabled
              </label>
              <button
                type="button"
                onClick={() => handleChange('isEnabled', !formData.isEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  formData.isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={formData.isEnabled}
                id="isEnabled"
                disabled={submitting}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Flow Type and Configuration */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-2">Flow Configuration</h2>

            {/* Flow Type */}
            <div>
              <label htmlFor="flowType" className="block text-sm font-medium mb-1">
                Flow Type *
              </label>
              <select
                id="flowType"
                value={formData.flowType}
                onChange={(e) => handleChange('flowType', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={submitting}
              >
                <option value="standalone">Standalone Flow</option>
                <option value="webhook">Webhook Flow</option>
                <option value="child">Child Flow</option>
                <option value="gitlab">GitLab Flow</option>
                <option value="jira">Jira Flow</option>
                <option value="data_validation">Data Validation Flow</option>
              </select>
            </div>

            {/* Webhook Selection (conditional) */}
            {(formData.flowType === 'webhook' || formData.flowType === 'gitlab' || formData.flowType === 'jira') && (
              <div>
                <label htmlFor="webhookId" className="block text-sm font-medium mb-1">
                  {formData.flowType === 'gitlab' 
                    ? 'GitLab Webhook *' 
                    : formData.flowType === 'jira' 
                      ? 'Jira Webhook *' 
                      : 'Webhook *'}
                </label>
                <select
                  id="webhookId"
                  value={formData.webhookId || ''}
                  onChange={(e) => handleChange('webhookId', e.target.value)}
                  className={`w-full p-2 border rounded-md ${errors.webhookId ? 'border-red-500' : 'border-gray-300'}`}
                  disabled={submitting || loading}
                >
                  <option value="">Select a webhook</option>
                  {webhooks.map((webhook) => (
                    <option key={webhook.id} value={webhook.id}>
                      {webhook.name}
                    </option>
                  ))}
                </select>
                {errors.webhookId && (
                  <p className="text-red-500 text-sm mt-1">{errors.webhookId}</p>
                )}
                {webhooks.length === 0 && !loading && (
                  <p className="text-amber-600 text-sm mt-1">
                    No webhooks available. <Link href="/owlflow/webhooks" className="text-blue-600 hover:underline">Create a webhook</Link> first.
                  </p>
                )}
                {formData.flowType === 'gitlab' && (
                  <p className="text-sm text-gray-600 mt-1">
                    Select a webhook that will receive GitLab events.
                  </p>
                )}
                {formData.flowType === 'jira' && (
                  <p className="text-sm text-gray-600 mt-1">
                    Select a webhook that will receive Jira events.
                  </p>
                )}
              </div>
            )}

            {/* Parent Flow Selection (conditional) */}
            {formData.flowType === 'child' && (
              <div>
                <label htmlFor="parentFlowId" className="block text-sm font-medium mb-1">
                  Parent Flow *
                </label>
                <select
                  id="parentFlowId"
                  value={formData.parentFlowId || ''}
                  onChange={(e) => handleChange('parentFlowId', e.target.value)}
                  className={`w-full p-2 border rounded-md ${errors.parentFlowId ? 'border-red-500' : 'border-gray-300'}`}
                  disabled={submitting || loading}
                >
                  <option value="">Select a parent flow</option>
                  {parentFlows.map((flow) => (
                    <option key={flow.id} value={flow.id}>
                      {flow.name}
                    </option>
                  ))}
                </select>
                {errors.parentFlowId && (
                  <p className="text-red-500 text-sm mt-1">{errors.parentFlowId}</p>
                )}
                {parentFlows.length === 0 && !loading && (
                  <p className="text-amber-600 text-sm mt-1">
                    No parent flows available.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conditions Section */}
      <div className="bg-white rounded-lg shadow p-6" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            {formData.flowType === 'data_validation' ? 'Validation Conditions' : 'Conditions'}
          </h2>
          <button
            onClick={addCondition}
            className="px-2 py-1 text-sm rounded-md text-white"
            style={{ background: 'var(--primary-blue)' }}
            disabled={submitting}
          >
            Add Condition
          </button>
        </div>

        {formData.flowType === 'data_validation' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>Data Validation Flow:</strong> Add conditions to validate request headers and body keys. 
              Each condition can trigger a different child flow based on the validation result.
            </p>
          </div>
        )}

        {formData.conditions.length === 0 ? (
          <div>
            <p className="text-gray-500">
              {formData.flowType === 'data_validation' 
                ? 'No validation conditions added. Add conditions to validate incoming data.'
                : 'No conditions added. Add conditions to control when this flow should run.'}
            </p>
            {errors.conditions && (
              <p className="text-red-500 text-sm mt-1">{errors.conditions}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {formData.conditions.map((condition, index) => (
              <div key={condition.id} className="border rounded-md p-4 relative" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  onClick={() => removeCondition(condition.id)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
                  disabled={submitting}
                >
                  ✕
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Field */}
                  <div>
                    <label htmlFor={`field-${condition.id}`} className="block text-sm font-medium mb-1">
                      Field *
                    </label>
                    <input
                      type="text"
                      id={`field-${condition.id}`}
                      value={condition.field}
                      onChange={(e) => updateCondition(condition.id, 'field', e.target.value)}
                      className={`w-full p-2 border rounded-md ${errors[`condition-${index}-field`] ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="e.g. data.status"
                      disabled={submitting}
                    />
                    {errors[`condition-${index}-field`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`condition-${index}-field`]}</p>
                    )}
                  </div>

                  {/* Operator */}
                  <div>
                    <label htmlFor={`operator-${condition.id}`} className="block text-sm font-medium mb-1">
                      Operator
                    </label>
                    <select
                      id={`operator-${condition.id}`}
                      value={condition.operator}
                      onChange={(e) => updateCondition(condition.id, 'operator', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      disabled={submitting}
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

                  {/* Value (conditional) */}
                  {condition.operator !== 'exists' && condition.operator !== 'not_exists' && (
                    <div>
                      <label htmlFor={`value-${condition.id}`} className="block text-sm font-medium mb-1">
                        Value *
                      </label>
                      <input
                        type="text"
                        id={`value-${condition.id}`}
                        value={condition.value}
                        onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                        className={`w-full p-2 border rounded-md ${errors[`condition-${index}-value`] ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Enter value"
                        disabled={submitting}
                      />
                      {errors[`condition-${index}-value`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`condition-${index}-value`]}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Child Flow Selection */}
                <div className="mt-4">
                  <label htmlFor={`childFlow-${condition.id}`} className="block text-sm font-medium mb-1">
                    Child Flow to Call (If Condition Matches)
                  </label>
                  <select
                    id={`childFlow-${condition.id}`}
                    value={condition.childFlowId || ''}
                    onChange={(e) => updateCondition(condition.id, 'childFlowId', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    disabled={submitting || loading}
                  >
                    <option value="">None (Optional)</option>
                    {parentFlows.map((flow) => (
                      <option key={flow.id} value={flow.id}>
                        {flow.name}
                      </option>
                    ))}
                  </select>
                  {parentFlows.length === 0 && !loading && (
                    <p className="text-amber-600 text-sm mt-1">
                      No child flows available. Create flows to use as children.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
