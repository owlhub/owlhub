"use client";

import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import AppIcon from "@/src/components/AppIcon";
import Link from "next/link";
import Table from "@/src/components/Table";
import { useRouter } from "next/navigation";

// Format date in a consistent way for both server and client rendering
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface Finding {
  id: string;
  activeCount: number;
  hiddenCount: number;
  lastDetectedAt: string | null;
  integration: {
    id: string;
    name: string;
    appType: {
      icon: string;
    };
  };
  securityFinding: {
    id: string;
    name: string;
    severity: string;
  };
}

// Define a type for nested sort keys
type NestedSortKey = string | keyof Finding | `${'integration' | 'securityFinding'}.${string}`;

// Define a custom column type that allows for NestedSortKey in sortKey
interface FindingColumn {
  header: string;
  accessor: keyof Finding | ((item: Finding) => ReactNode);
  className?: string;
  sortable?: boolean;
  sortKey?: keyof Finding | NestedSortKey;
  width?: string;
}

interface FilterState {
  status: string[];
  severity: string[];
  integration: string;
  dateFrom: string;
  dateTo: string;
}

interface FindingsTableProps {
  findings: Finding[];
  filters: FilterState;
}

export default function FindingsTable({ findings, filters }: FindingsTableProps) {
  const router = useRouter();
  const [filteredFindings, setFilteredFindings] = useState<Finding[]>(findings);
  const [selectedFindings, setSelectedFindings] = useState<Finding[]>([]);

  // Function to apply filters to the findings data
  const applyFilters = useCallback((filterState: FilterState) => {
    let result = [...findings];

    // Filter by status (active/hidden)
    if (filterState.status.length > 0) {
      result = result.filter(finding => {
        if (filterState.status.includes('active') && finding.activeCount > 0) return true;
        if (filterState.status.includes('hidden') && finding.hiddenCount > 0) return true;
        return false;
      });
    }

    // Filter by severity
    if (filterState.severity.length > 0) {
      result = result.filter(finding => 
        filterState.severity.includes(finding.securityFinding.severity)
      );
    }

    // Filter by integration
    if (filterState.integration) {
      result = result.filter(finding => 
        finding.integration.id === filterState.integration
      );
    }

    // Filter by date range
    if (filterState.dateFrom || filterState.dateTo) {
      result = result.filter(finding => {
        if (!finding.lastDetectedAt) return false;

        // Format the lastDetectedAt date to YYYY-MM-DD for consistent comparison
        const detectedDateObj = new Date(finding.lastDetectedAt);
        const detectedDateFormatted = formatDate(detectedDateObj);

        if (filterState.dateFrom && filterState.dateFrom.trim() !== '') {
          // Compare dates as strings in YYYY-MM-DD format
          if (detectedDateFormatted < filterState.dateFrom) return false;
        }

        if (filterState.dateTo && filterState.dateTo.trim() !== '') {
          // Compare dates as strings in YYYY-MM-DD format
          if (detectedDateFormatted > filterState.dateTo) return false;
        }

        return true;
      });
    }

    setFilteredFindings(result);
  }, [findings]);

  // Apply filters when they change
  useEffect(() => {
    applyFilters(filters);
  }, [filters, findings, applyFilters]);

  const handleRowClick = (finding: Finding) => {
    router.push(`/security/posture-findings/${finding.id}`);
  };

  const handleSelectionChange = useCallback((selected: Finding[]) => {
    setSelectedFindings(selected);
    console.log('Selected findings:', selected.length);
  }, []);

  const columns: FindingColumn[] = [
    {
      header: "Severity",
      accessor: (finding: Finding) => (
        <span 
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" 
          style={{ 
            background: finding.securityFinding.severity === 'critical' 
              ? 'rgba(220, 38, 38, 0.1)' 
              : finding.securityFinding.severity === 'high'
              ? 'rgba(234, 88, 12, 0.1)'
              : finding.securityFinding.severity === 'medium'
              ? 'rgba(234, 179, 8, 0.1)'
              : 'rgba(34, 197, 94, 0.1)',
            color: finding.securityFinding.severity === 'critical' 
              ? 'rgb(220, 38, 38)' 
              : finding.securityFinding.severity === 'high'
              ? 'rgb(234, 88, 12)'
              : finding.securityFinding.severity === 'medium'
              ? 'rgb(234, 179, 8)'
              : 'rgb(34, 197, 94)'
          }}
        >
          {finding.securityFinding.severity.charAt(0).toUpperCase() + finding.securityFinding.severity.slice(1)}
        </span>
      ),
      sortable: true,
      sortKey: "securityFinding.severity" as NestedSortKey,
      width: "100px",
    },
    {
      header: "Finding",
      accessor: (finding: Finding) => (
        <Link href={`/security/posture-findings/${finding.id}`} className="text-[var(--primary-blue)] hover:underline" onClick={(e) => e.stopPropagation()}>
          {finding.securityFinding.name}
        </Link>
      ),
      sortable: true,
      sortKey: "securityFinding.name" as NestedSortKey,
      width: "250px",
    },
    {
      header: "Integration",
      accessor: (finding: Finding) => (
        <div className="flex items-center">
          <AppIcon iconName={finding.integration.appType.icon} size={20} className="mr-2" />
          {finding.integration.name}
        </div>
      ),
      sortable: true,
      sortKey: "integration.name" as NestedSortKey,
      width: "200px",
    },
    {
      header: "Findings Count",
      accessor: (finding: Finding) => (
        <div className="relative group">
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-help" 
            style={{
              background: 'rgb(217, 217, 217)',
              color: 'rgb(61, 61, 61)'
            }}
          >
            {filters.status.includes('active') ? finding.activeCount : finding.hiddenCount}
          </span>
          <div className="absolute z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 -mt-1 left-0 ml-6 whitespace-nowrap">
            Active Count: {finding.activeCount}<br />
            Hidden Count: {finding.hiddenCount}
          </div>
        </div>
      ),
      sortable: true,
      sortKey: filters.status.includes('active') ? "activeCount" as keyof Finding : "hiddenCount" as keyof Finding,
      width: "150px",
    },
    {
      header: "Last Detected",
      accessor: (finding: Finding) => finding.lastDetectedAt ? formatDate(new Date(finding.lastDetectedAt)) : 'Never',
      sortable: true,
      sortKey: "lastDetectedAt" as keyof Finding,
      width: "150px",
    },
  ];

  return (
      <>
    <div className="rounded-lg shadow-sm" style={{ background: 'var(--card-bg)', color: 'var(--foreground)' }}>
      {selectedFindings.length > 0 && (
        <div className="mb-4 p-2 bg-opacity-10 rounded flex justify-between items-center">
          <span>{selectedFindings.length} findings selected</span>
          <button 
            onClick={() => setSelectedFindings([])} 
            className="text-sm text-[var(--primary-blue)] hover:text-[var(--secondary-blue)] flex items-center"
            aria-label="Clear selection"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
      <Table
        data={filteredFindings}
        columns={columns as unknown as {
          header: string;
          accessor: keyof Finding | ((item: Finding) => ReactNode);
          className?: string;
          sortable?: boolean;
          sortKey?: keyof Finding;
          width?: string;
        }[]}
        onRowClick={handleRowClick}
        keyExtractor={(finding) => finding.id}
        defaultRowsPerPage={10}
        emptyMessage="No security findings found"
        selectable={true}
        onSelectionChange={handleSelectionChange}
        selectedItems={selectedFindings}
      />

      </>
  );
}

// Export the handleFilterChange function to be used by the FilterSection component
export { type FilterState };
