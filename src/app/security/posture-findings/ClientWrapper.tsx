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

export default function ClientWrapper({ findings, integrations }: ClientWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // Sync filters with URL when URL changes
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
    }
  }, [searchParams, defaultFilters, filters]);

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
  };

  return (
    <>
      <FilterSection 
        integrations={integrations} 
        onFilterChange={handleFilterChange}
        filters={filters}
      />
      <FindingsTable 
        findings={findings} 
        filters={filters}
      />
    </>
  );
}
