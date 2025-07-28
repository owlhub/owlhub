"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Define interfaces for API response data
interface IntegrationCount {
  integrationId: string;
  integrationName: string;
  appName: string;
  appIcon: string | null;
  active: number;
  hidden: number;
  total: number;
}

interface RecentFinding {
  id: string;
  key: string;
  description: string;
  hidden: boolean;
  lastDetectedAt: string | Date;
  integration: {
    id: string;
    name: string;
    app: {
      name: string;
      icon: string | null;
    };
  };
  finding: {
    id: string;
    name: string;
    severity: string;
  };
}

// Function to fetch data from the CASB overview API
async function fetchCASBOverview() {
  const response = await fetch(`/api/casb/overview`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CASB overview: ${response.statusText}`);
  }

  return response.json();
}

// Define interface for overview data
interface OverviewData {
  totalFindings: number;
  totalActive: number;
  totalHidden: number;
  severityCounts: {
    [severity: string]: {
      active: number;
      hidden: number;
      total: number;
    };
  };
  integrationCounts: IntegrationCount[];
  recentFindings: RecentFinding[];
}

export default function CASBPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if the user is authenticated
    if (status === "unauthenticated") {
      router.push("/login?redirect=/casb/overview");
      return;
    }

    // Only fetch data if the user is authenticated
    if (status === "authenticated") {
      const fetchData = async () => {
        try {
          setLoading(true);
          const data = await fetchCASBOverview();
          setOverview(data.overview);
          setError(null);
        } catch (err) {
          console.error("Error fetching CASB overview:", err);
          setError("Failed to fetch CASB overview data. Please try again later.");
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [status, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">CASB Dashboard</h1>
        </header>
        <div className="flex justify-center items-center h-64">
          <p className="text-lg">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">CASB Dashboard</h1>
        </header>
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-8">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // If no overview data is available yet, show a placeholder
  if (!overview) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">CASB Dashboard</h1>
        </header>
        <div className="flex justify-center items-center h-64">
          <p className="text-lg">No data available</p>
        </div>
      </div>
    );
  }

  // Extract counts for dashboard widgets
  const totalFindings = overview.totalFindings;
  const totalActive = overview.totalActive;
  const totalHidden = overview.totalHidden;

  // Get counts by severity
  const criticalCount = overview.severityCounts.critical?.total || 0;
  const highCount = overview.severityCounts.high?.total || 0;
  const mediumCount = overview.severityCounts.medium?.total || 0;
  const lowCount = overview.severityCounts.low?.total || 0;

  // Get integration count
  const integrationsCount = overview.integrationCounts.length;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">CASB Dashboard</h1>
      </header>

      {/* Dashboard Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-6 rounded-lg shadow-sm border-t-4" style={{ 
          background: 'var(--card-bg)', 
          borderTopColor: 'var(--primary-blue)',
          color: 'var(--foreground)'
        }}>
          <h2 className="text-lg font-semibold mb-2">Enabled Integrations</h2>
          <p className="text-3xl font-bold">{integrationsCount}</p>
        </div>

        <div className="p-6 rounded-lg shadow-sm border-t-4" style={{ 
          background: 'var(--card-bg)', 
          borderTopColor: 'var(--accent-green)',
          color: 'var(--foreground)'
        }}>
          <h2 className="text-lg font-semibold mb-2">Total Findings</h2>
          <p className="text-3xl font-bold">{totalFindings}</p>
          <div className="text-sm mt-2">
            <span className="mr-3">Active: {totalActive}</span>
            <span>Hidden: {totalHidden}</span>
          </div>
        </div>

        <div className="p-6 rounded-lg shadow-sm border-t-4" style={{ 
          background: 'var(--card-bg)', 
          borderTopColor: 'var(--error)',
          color: 'var(--foreground)'
        }}>
          <h2 className="text-lg font-semibold mb-2">Critical Findings</h2>
          <p className="text-3xl font-bold">{criticalCount}</p>
          <div className="text-sm mt-2">
            <span className="mr-3">Active: {overview.severityCounts.critical?.active || 0}</span>
            <span>Hidden: {overview.severityCounts.critical?.hidden || 0}</span>
          </div>
        </div>

        <div className="p-6 rounded-lg shadow-sm border-t-4" style={{ 
          background: 'var(--card-bg)', 
          borderTopColor: 'var(--accent-orange)',
          color: 'var(--foreground)'
        }}>
          <h2 className="text-lg font-semibold mb-2">High Risk Findings</h2>
          <p className="text-3xl font-bold">{highCount}</p>
          <div className="text-sm mt-2">
            <span className="mr-3">Active: {overview.severityCounts.high?.active || 0}</span>
            <span>Hidden: {overview.severityCounts.high?.hidden || 0}</span>
          </div>
        </div>
      </div>

      {/* Recent Findings Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Recent Findings (Last 7 Days)</h2>
        <div className="bg-card rounded-lg shadow-sm overflow-hidden">
          {overview.recentFindings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left">Finding</th>
                    <th className="px-4 py-3 text-left">Integration</th>
                    <th className="px-4 py-3 text-left">Severity</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentFindings.map((finding: RecentFinding) => (
                    <tr key={finding.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3">{finding.description}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          {finding.integration.app.icon && (
                            <img 
                              src={finding.integration.app.icon} 
                              alt={finding.integration.app.name} 
                              className="w-5 h-5 mr-2" 
                            />
                          )}
                          {finding.integration.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          finding.finding.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          finding.finding.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          finding.finding.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {finding.finding.severity.charAt(0).toUpperCase() + finding.finding.severity.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          finding.hidden ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {finding.hidden ? 'Hidden' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(finding.lastDetectedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No recent findings in the last 7 days.
            </div>
          )}
        </div>
      </div>

      {/* Integration Findings Section */}
      <div>
        <h2 className="text-xl font-bold mb-4">Findings by Integration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {overview.integrationCounts.map((integration: IntegrationCount) => (
            <div key={integration.integrationId} className="bg-card rounded-lg shadow-sm p-4">
              <div className="flex items-center mb-2">
                {integration.appIcon && (
                  <img 
                    src={integration.appIcon} 
                    alt={integration.appName} 
                    className="w-6 h-6 mr-2" 
                  />
                )}
                <h3 className="font-semibold">{integration.integrationName}</h3>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                {integration.appName}
              </div>
              <div className="flex justify-between mt-2">
                <div>
                  <div className="text-2xl font-bold">{integration.total}</div>
                  <div className="text-xs text-muted-foreground">Total Findings</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">
                    <span className="text-green-600">{integration.active} Active</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">{integration.hidden} Hidden</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
