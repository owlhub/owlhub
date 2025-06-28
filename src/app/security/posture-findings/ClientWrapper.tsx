"use client";

import React, { useState } from 'react';
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
  const [filters, setFilters] = useState<FilterState>({
    status: ['active'],
    severity: ['critical', 'high', 'medium', 'low'],
    integration: '',
    dateFrom: '',
    dateTo: ''
  });

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
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
