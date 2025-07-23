"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FilterSection from './FilterSection';
import FindingsTable, { FilterState, Finding as FindingsTableFinding } from './FindingsTable';

interface Integration {
  id: string;
  name: string;
}

interface ClientWrapperProps {
  findings: FindingsTableFinding[];
  integrations: Integration[];
}

export default function ClientWrapper({ findings: initialFindings, integrations: initialIntegrations }: ClientWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [findings, setFindings] = useState<FindingsTableFinding[]>(initialFindings);
  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrations);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState<boolean>(false);

  // Default filter values - memoized to prevent recreation on every render
  const defaultFilters = useMemo<FilterState>(() => ({
    status: ['active'],
    severity: ['critical', 'high', 'medium', 'low'],
    integration: '',
    dateFrom: '',
    dateTo: ''
  }), []);

  // Initialize filters from URL query parameters or use defaults
  const [filters, setFilters] = useState<FilterState>(() => {
    // Get filter values from URL query parameters
    const statusParam = searchParams.get('status');
    const severityParam = searchParams.get('severity');
    const integrationParam = searchParams.get('integration');
    const dateFromParam = searchParams.get('dateFrom');
    const dateToParam = searchParams.get('dateTo');

    return {
      status: statusParam ? statusParam.split(',') : defaultFilters.status,
      severity: severityParam ? severityParam.split(',') : defaultFilters.severity,
      integration: integrationParam || defaultFilters.integration,
      dateFrom: dateFromParam || defaultFilters.dateFrom,
      dateTo: dateToParam || defaultFilters.dateTo
    };
  });

  // Fetch all active integrations
  const fetchAllIntegrations = async () => {
    setIsLoadingIntegrations(true);
    try {
      // Fetch data from API
      const response = await fetch(`/api/security/posture-findings?mode=integrations`);

      if (!response.ok) {
        throw new Error(`Failed to fetch integrations: ${response.statusText}`);
      }

      const data = await response.json();

      // Update state with new data
      setIntegrations(data.integrations);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setIsLoadingIntegrations(false);
    }
  };

  // Fetch findings from API with current filters
  const fetchFindings = async (currentFilters: FilterState) => {
    setIsLoading(true);
    try {
      // Create URL with query parameters
      const params = new URLSearchParams();
      params.set('mode', 'summary');

      if (currentFilters.status.length > 0) {
        params.set('status', currentFilters.status.join(','));
      }

      if (currentFilters.severity.length > 0) {
        params.set('severity', currentFilters.severity.join(','));
      }

      if (currentFilters.integration) {
        params.set('integration', currentFilters.integration);
      }

      if (currentFilters.dateFrom) {
        params.set('dateFrom', currentFilters.dateFrom);
      }

      if (currentFilters.dateTo) {
        params.set('dateTo', currentFilters.dateTo);
      }

      // Fetch data from API
      const response = await fetch(`/api/security/posture-findings?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch findings: ${response.statusText}`);
      }

      const data = await response.json();

      // Update state with new data
      setFindings(data.findings);
    } catch (error) {
      console.error('Error fetching findings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all active integrations when component mounts
  useEffect(() => {
    fetchAllIntegrations();
  }, []);

  // Sync filters with URL when URL changes and fetch new data
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const severityParam = searchParams.get('severity');
    const integrationParam = searchParams.get('integration');
    const dateFromParam = searchParams.get('dateFrom');
    const dateToParam = searchParams.get('dateTo');

    // Only update filters if URL parameters are different from current filters
    const newFilters = {
      status: statusParam ? statusParam.split(',') : defaultFilters.status,
      severity: severityParam ? severityParam.split(',') : defaultFilters.severity,
      integration: integrationParam || defaultFilters.integration,
      dateFrom: dateFromParam || defaultFilters.dateFrom,
      dateTo: dateToParam || defaultFilters.dateTo
    };

    // Check if filters have changed
    const filtersChanged = 
      JSON.stringify(newFilters.status) !== JSON.stringify(filters.status) ||
      JSON.stringify(newFilters.severity) !== JSON.stringify(filters.severity) ||
      newFilters.integration !== filters.integration ||
      newFilters.dateFrom !== filters.dateFrom ||
      newFilters.dateTo !== filters.dateTo;

    if (filtersChanged) {
      setFilters(newFilters);
      fetchFindings(newFilters);
    }
  }, [searchParams, defaultFilters]);

  // Update URL query parameters when filters change
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);

    // Create a new URLSearchParams object
    const params = new URLSearchParams();

    // Add filter values to query parameters
    if (newFilters.status.length > 0) {
      params.set('status', newFilters.status.join(','));
    }

    if (newFilters.severity.length > 0) {
      params.set('severity', newFilters.severity.join(','));
    }

    if (newFilters.integration) {
      params.set('integration', newFilters.integration);
    }

    if (newFilters.dateFrom) {
      params.set('dateFrom', newFilters.dateFrom);
    }

    if (newFilters.dateTo) {
      params.set('dateTo', newFilters.dateTo);
    }

    // Update the URL without refreshing the page
    router.push(`?${params.toString()}`, { scroll: false });

    // Fetch new data with the updated filters
    fetchFindings(newFilters);
  };

  return (
    <>
      <FilterSection 
        integrations={integrations} 
        onFilterChange={handleFilterChange}
        filters={filters}
      />

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          <span className="ml-2">Loading...</span>
        </div>
      ) : (
        <FindingsTable 
          findings={findings} 
          filters={filters}
        />
      )}
    </>
  );
}
