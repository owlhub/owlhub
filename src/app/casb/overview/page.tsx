"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppIcon from "@/components/AppIcon";

// Define interfaces for API response data

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
  enabledIntegrationsCount: number;
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
  const enabledIntegrationsCount = overview.enabledIntegrationsCount;

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
          <p className="text-3xl font-bold">{enabledIntegrationsCount}</p>
          <div className="text-sm mt-2">
            <span>Cloud apps with active monitoring</span>
          </div>
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
        <div className="bg-card rounded-lg shadow-sm overflow-hidden border border-border" style={{ backgroundColor: 'var(--card-bg)' }}>
          {overview.recentFindings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border" style={{ backgroundColor: 'var(--muted, rgba(0,0,0,0.02))' }}>
                    <th className="px-4 py-3 text-left font-semibold text-sm">Finding</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm">Integration</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm">Severity</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm">Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentFindings.map((finding: RecentFinding, index: number) => (
                    <tr 
                      key={finding.id} 
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                      style={{ backgroundColor: index % 2 === 0 ? 'var(--card-bg)' : 'var(--muted-light, rgba(0,0,0,0.01))' }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                          {finding.description}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <AppIcon 
                            iconName={finding.integration.app.name} 
                            size={20} 
                            className="mr-2" 
                          />
                          <div>
                            <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                              {finding.integration.name}
                            </div>
                            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                              {finding.integration.app.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          finding.finding.severity === 'critical' ? 'bg-red-100 text-red-800 border border-red-200 shadow-sm' :
                          finding.finding.severity === 'high' ? 'bg-orange-100 text-orange-800 border border-orange-200 shadow-sm' :
                          finding.finding.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200 shadow-sm' :
                          'bg-blue-100 text-blue-800 border border-blue-200 shadow-sm'
                        }`} style={{
                          backgroundColor: finding.finding.severity === 'critical' ? 'var(--error-light, #FEE2E2)' : 
                                          finding.finding.severity === 'high' ? 'var(--warning-light, #FFEDD5)' : 
                                          finding.finding.severity === 'medium' ? 'var(--caution-light, #FEF9C3)' : 
                                          'var(--info-light, #DBEAFE)',
                          color: finding.finding.severity === 'critical' ? 'var(--error-dark, #991B1B)' : 
                                finding.finding.severity === 'high' ? 'var(--warning-dark, #9A3412)' : 
                                finding.finding.severity === 'medium' ? 'var(--caution-dark, #854D0E)' : 
                                'var(--info-dark, #1E40AF)',
                          borderColor: finding.finding.severity === 'critical' ? 'var(--error, #EF4444)' : 
                                      finding.finding.severity === 'high' ? 'var(--warning, #F97316)' : 
                                      finding.finding.severity === 'medium' ? 'var(--caution, #EAB308)' : 
                                      'var(--info, #3B82F6)'
                        }}>
                          {finding.finding.severity.charAt(0).toUpperCase() + finding.finding.severity.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          finding.hidden ? 'bg-gray-100 text-gray-800 border border-gray-200 shadow-sm' : 'bg-green-100 text-green-800 border border-green-200 shadow-sm'
                        }`} style={{
                          backgroundColor: finding.hidden ? 'var(--muted-light, #F3F4F6)' : 'var(--success-light, #DCFCE7)',
                          color: finding.hidden ? 'var(--muted-dark, #4B5563)' : 'var(--success-dark, #166534)',
                          borderColor: finding.hidden ? 'var(--muted, #9CA3AF)' : 'var(--success, #22C55E)'
                        }}>
                          {finding.hidden ? 'Hidden' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                          {new Date(finding.lastDetectedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center" style={{ color: 'var(--muted-foreground)' }}>
              <div className="mb-2 text-3xl opacity-30">📊</div>
              <p className="font-medium mb-1">No Recent Findings</p>
              <p className="text-sm">No findings have been detected in the last 7 days.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
