"use client";

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import ClientWrapper from "./ClientWrapper";

// Define valid severity levels
const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'];

interface IntegrationFinding {
  id: string;
  integrationId: string;
  appFindingId: string;
  severity: string;
  integration: {
    name: string;
    app: {
      name: string;
    };
  };
  appFinding: {
    name: string;
    severity: string;
    description: string;
  };
  lastDetectedAt: string | null;
}

interface IntegrationFindingDetailsProps {
  id: string;
}

export default function IntegrationFindingDetails({ id }: IntegrationFindingDetailsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [integrationFinding, setIntegrationFinding] = useState<IntegrationFinding | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [isUpdatingSeverity, setIsUpdatingSeverity] = useState(false);
  const [severityUpdateError, setSeverityUpdateError] = useState<string | null>(null);

  // Function to handle severity change
  const handleSeverityChange = async (newSeverity: string) => {
    if (!integrationFinding || newSeverity === integrationFinding.severity) {
      return; // No change or no finding
    }

    try {
      setIsUpdatingSeverity(true);
      setSeverityUpdateError(null);

      const response = await fetch(`/api/casb/posture-findings/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          severity: newSeverity
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update severity: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success || !data.integrationFinding) {
        throw new Error('Failed to update severity. Please try again.');
      }

      // Update the integration finding with the new data
      setIntegrationFinding({
        ...integrationFinding,
        severity: data.integrationFinding.severity
      });

      // Update counts if they changed
      if (data.activeCount !== undefined) setActiveCount(data.activeCount);
      if (data.hiddenCount !== undefined) setHiddenCount(data.hiddenCount);

    } catch (err) {
      console.error("Error updating severity:", err);
      setSeverityUpdateError("Failed to update severity. Please try again.");
    } finally {
      setIsUpdatingSeverity(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/casb/posture-findings/${id}`, {
          cache: 'no-store'
        });

        if (!response.ok) {
          if (response.status === 404) {
            // Handle 404 case
            window.location.href = '/not-found';
            return;
          }
          throw new Error(`Failed to fetch finding data: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success || !data.integrationFinding) {
          window.location.href = '/not-found';
          return;
        }

        setIntegrationFinding({
          id: data.integrationFinding.id,
          severity: data.integrationFinding.severity,
          integrationId: data.integrationFinding.integration.id,
          appFindingId: data.integrationFinding.appFinding.id,
          integration: {
            name: data.integrationFinding.integration.name,
            app: data.integrationFinding.integration.app
          },
          appFinding: {
            name: data.integrationFinding.appFinding.name,
            severity: data.integrationFinding.appFinding.severity,
            description: data.integrationFinding.appFinding.description
          },
          lastDetectedAt: data.integrationFinding.lastDetectedAt
        });

        // Get counts from API response
        setActiveCount(data.activeCount || 0);
        setHiddenCount(data.hiddenCount || 0);
      } catch (err) {
        console.error("Error fetching integration finding:", err);
        setError("Failed to load integration finding details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Format severity for display
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { bg: 'rgba(220, 38, 38, 0.1)', color: 'rgb(220, 38, 38)' };
      case 'high':
        return { bg: 'rgba(234, 88, 12, 0.1)', color: 'rgb(234, 88, 12)' };
      case 'medium':
        return { bg: 'rgba(234, 179, 8, 0.1)', color: 'rgb(234, 179, 8)' };
      case 'low':
        return { bg: 'rgba(34, 197, 94, 0.1)', color: 'rgb(34, 197, 94)' };
      default:
        return { bg: 'rgba(107, 114, 128, 0.1)', color: 'rgb(107, 114, 128)' };
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <Link
            href="/casb/posture-findings"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            ← Back to Posture Findings
          </Link>
        </div>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-blue)]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <Link
            href="/casb/posture-findings"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            ← Back to Posture Findings
          </Link>
        </div>
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!integrationFinding) {
    return null;
  }

  const severityStyle = getSeverityStyle(integrationFinding.severity);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href="/casb/posture-findings"
          className="text-blue-600 hover:underline flex items-center gap-1"
        >
          ← Back to Posture Findings
        </Link>
      </div>

      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{integrationFinding.appFinding.name}</h1>
          <div className="flex items-center">
            {severityUpdateError && (
              <div className="mr-3 text-red-600 text-sm">
                {severityUpdateError}
              </div>
            )}
            <div className="relative">
              <select
                value={integrationFinding.severity}
                onChange={(e) => handleSeverityChange(e.target.value)}
                disabled={isUpdatingSeverity}
                className="appearance-none px-3 py-1 pr-8 rounded-full text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ 
                  background: severityStyle.bg,
                  color: severityStyle.color,
                  borderColor: 'transparent'
                }}
              >
                {SEVERITY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                {isUpdatingSeverity ? (
                  <div className="animate-spin h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 rounded-lg shadow-sm" style={{ background: 'var(--card-bg)', color: 'var(--foreground)' }}>
          <h2 className="text-xl font-semibold mb-4">Integration Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Integration</p>
              <p className="font-medium">{integrationFinding.integration.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Integration Type</p>
              <p className="font-medium">{integrationFinding.integration.app.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Detected</p>
              <p className="font-medium">
                {integrationFinding.lastDetectedAt
                  ? (() => {
                      const date = new Date(integrationFinding.lastDetectedAt);
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      return `${year}-${month}-${day}`;
                    })() 
                  : 'Never'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg shadow-sm" style={{ background: 'var(--card-bg)', color: 'var(--foreground)' }}>
          <h2 className="text-xl font-semibold mb-4">Description</h2>
          <p>{integrationFinding.appFinding.description}</p>
        </div>
      </div>

      <ClientWrapper
        integrationFindingId={integrationFinding.id}
        initialActiveCount={activeCount}
        initialHiddenCount={hiddenCount}
      />
    </div>
  );
}
