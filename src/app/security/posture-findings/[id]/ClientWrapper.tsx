"use client";

import React, { useState, useEffect, useCallback } from 'react';
import FindingDetailsSlider from './FindingDetailsSlider';

interface FindingDetail {
  id: string;
  description: string;
  hidden: boolean;
  additionalInfo: string;
  createdAt: string | Date;
}

interface ClientWrapperProps {
  integrationId: string;
  securityFindingId: string;
  initialActiveCount: number;
  initialHiddenCount: number;
}

type TabType = 'active' | 'hidden';

export default function ClientWrapper({ 
  integrationId, 
  securityFindingId,
  initialActiveCount, 
  initialHiddenCount 
}: ClientWrapperProps) {
  const [activeCount, setActiveCount] = useState(initialActiveCount);
  const [hiddenCount, setHiddenCount] = useState(initialHiddenCount);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [activeFindings, setActiveFindings] = useState<FindingDetail[]>([]);
  const [hiddenFindings, setHiddenFindings] = useState<FindingDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch findings based on hidden status
  const fetchFindings = useCallback(async (hidden: boolean) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/security/posture-findings?integrationId=${integrationId}&securityFindingId=${securityFindingId}&hidden=${hidden}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch ${hidden ? 'hidden' : 'active'} findings`);
      }

      const data = await response.json();

      if (hidden) {
        setHiddenFindings(data.findings);
      } else {
        setActiveFindings(data.findings);
      }
    } catch (err) {
      console.error(`Error fetching ${hidden ? 'hidden' : 'active'} findings:`, err);
      setError(`Failed to load ${hidden ? 'hidden' : 'active'} findings. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  }, [integrationId, securityFindingId]);

  // Fetch active findings on initial load
  useEffect(() => {
    fetchFindings(false);
  }, [fetchFindings]);

  // Function to handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);

    // Fetch data for the selected tab if we haven't loaded it yet
    if (tab === 'hidden' && hiddenFindings.length === 0) {
      fetchFindings(true);
    } else if (tab === 'active' && activeFindings.length === 0) {
      fetchFindings(false);
    }
  };

  // Function to update counts
  const updateCounts = (newActiveCount: number, newHiddenCount: number) => {
    setActiveCount(newActiveCount);
    setHiddenCount(newHiddenCount);
  };

  return (
    <div>
      {/* Tabs for Active and Hidden findings */}
      <div className="mb-8">
        <div className="border-b border-[var(--border-color)]">
          <div className="flex">
            <button
              className={`py-4 px-6 font-medium text-sm focus:outline-none ${
                activeTab === 'active'
                  ? 'border-b-2 border-[var(--primary-blue)] text-[var(--primary-blue)]'
                  : 'text-[var(--sidebar-text)]'
              }`}
              onClick={() => handleTabChange('active')}
            >
              Active ({activeCount})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm focus:outline-none ${
                activeTab === 'hidden'
                  ? 'border-b-2 border-[var(--primary-blue)] text-[var(--primary-blue)]'
                  : 'text-[var(--sidebar-text)]'
              }`}
              onClick={() => handleTabChange('hidden')}
            >
              Hidden ({hiddenCount})
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}

      {isLoading && activeTab === 'active' && activeFindings.length === 0 ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-blue)]"></div>
        </div>
      ) : isLoading && activeTab === 'hidden' && hiddenFindings.length === 0 ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-blue)]"></div>
        </div>
      ) : (
        <FindingDetailsSlider 
          findingDetails={activeTab === 'active' ? activeFindings : hiddenFindings} 
          integrationId={integrationId}
          securityFindingId={securityFindingId}
          onCountsUpdate={updateCounts}
          activeTab={activeTab}
          onRefreshData={() => fetchFindings(activeTab === 'hidden' ? true : false)}
        />
      )}
    </div>
  );
}
