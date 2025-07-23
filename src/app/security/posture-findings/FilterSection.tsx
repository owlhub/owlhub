"use client";

import React, { useState, useEffect } from 'react';
import { FilterState } from './FindingsTable';

interface FilterSectionProps {
  integrations?: Array<{
    id: string;
    name: string;
  }>;
  onFilterChange?: (filters: FilterState) => void;
  filters?: FilterState;
  disabled?: boolean;
}

export default function FilterSection({ 
  integrations = [], 
  onFilterChange,
  filters: externalFilters,
  disabled = false
}: FilterSectionProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSeverityDropdown, setShowSeverityDropdown] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>(externalFilters?.status || []);
  const [severityFilter, setSeverityFilter] = useState<string[]>(externalFilters?.severity || []);
  const [integrationFilter, setIntegrationFilter] = useState<string>(externalFilters?.integration || '');
  const [dateFrom, setDateFrom] = useState<string>(externalFilters?.dateFrom || '');
  const [dateTo, setDateTo] = useState<string>(externalFilters?.dateTo || '');

  // Update local state when external filters change
  useEffect(() => {
    if (externalFilters) {
      setStatusFilter(externalFilters.status);
      setSeverityFilter(externalFilters.severity);
      setIntegrationFilter(externalFilters.integration);
      setDateFrom(externalFilters.dateFrom);
      setDateTo(externalFilters.dateTo);
    }
  }, [externalFilters]);

  // Close severity dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.severity-dropdown-container')) {
        setShowSeverityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter([e.target.value]);
  };

  const handleSeverityCheckboxChange = (severity: string) => {
    if (severityFilter.includes(severity)) {
      // Remove the severity if it's already selected
      setSeverityFilter(severityFilter.filter(s => s !== severity));
    } else {
      // Add the severity if it's not selected
      setSeverityFilter([...severityFilter, severity]);
    }
  };

  const applyFilters = () => {
    if (onFilterChange) {
      onFilterChange({
        status: statusFilter,
        severity: severityFilter,
        integration: integrationFilter,
        dateFrom,
        dateTo
      });
    }
  };

  const resetFilters = () => {
    setStatusFilter(['active']);
    setSeverityFilter(['critical', 'high', 'medium', 'low']);
    setIntegrationFilter('');
    setDateFrom('');
    setDateTo('');

    if (onFilterChange) {
      onFilterChange({
        status: ['active'],
        severity: ['critical', 'high', 'medium', 'low'],
        integration: '',
        dateFrom: '',
        dateTo: ''
      });
    }
  };

  return (
    <div className="mb-6">
      <button 
        onClick={toggleFilters}
        disabled={disabled}
        className={`rounded-md border border-solid transition-colors flex items-center justify-center font-medium text-sm h-10 px-4 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-transparent'}`}
        style={{ 
          borderColor: 'var(--border-color)',
          color: 'var(--foreground)',
          background: 'var(--card-bg)'
        }}
      >
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>

      {showFilters && (
        <div className="mt-4 p-4 rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select 
                value={statusFilter[0] || ''}
                onChange={handleStatusChange}
                disabled={disabled}
                className={`w-full p-2 border rounded ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
              >
                <option value="active">Active</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="severity-dropdown-container">
              <label className="block text-sm font-medium mb-2">Severity</label>
              <div className="relative">
                <button 
                  onClick={() => !disabled && setShowSeverityDropdown(!showSeverityDropdown)}
                  disabled={disabled}
                  className={`w-full p-2 border rounded flex justify-between items-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
                >
                  <span>
                    {severityFilter.length === 0 
                      ? 'Select Severity' 
                      : severityFilter.length === 4 
                        ? 'All Severities' 
                        : `${severityFilter.length} selected`}
                  </span>
                  <span>▼</span>
                </button>
                {showSeverityDropdown && (
                  <div 
                    className="absolute z-10 w-full mt-1 border rounded shadow-lg"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
                  >
                    <div className="p-2">
                      <label className="flex items-center space-x-2 mb-2">
                        <input 
                          type="checkbox" 
                          checked={severityFilter.includes('critical')} 
                          onChange={() => handleSeverityCheckboxChange('critical')}
                          disabled={disabled}
                          className={disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        />
                        <span>Critical</span>
                      </label>
                      <label className="flex items-center space-x-2 mb-2">
                        <input 
                          type="checkbox" 
                          checked={severityFilter.includes('high')} 
                          onChange={() => handleSeverityCheckboxChange('high')}
                          disabled={disabled}
                          className={disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        />
                        <span>High</span>
                      </label>
                      <label className="flex items-center space-x-2 mb-2">
                        <input 
                          type="checkbox" 
                          checked={severityFilter.includes('medium')} 
                          onChange={() => handleSeverityCheckboxChange('medium')}
                          disabled={disabled}
                          className={disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        />
                        <span>Medium</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          checked={severityFilter.includes('low')} 
                          onChange={() => handleSeverityCheckboxChange('low')}
                          disabled={disabled}
                          className={disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        />
                        <span>Low</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Integration Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Integration</label>
              <select 
                value={integrationFilter}
                onChange={(e) => setIntegrationFilter(e.target.value)}
                disabled={disabled}
                className={`w-full p-2 border rounded ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
              >
                <option value="">All Integrations</option>
                {integrations.map((integration) => (
                  <option key={integration.id} value={integration.id}>
                    {integration.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Detected Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Date Detected</label>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <input 
                    type="date" 
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    disabled={disabled}
                    className={`w-full p-2 border rounded ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
                    placeholder="From"
                  />
                </div>
                <div className="flex items-center">
                  <span>-</span>
                </div>
                <div className="flex-1">
                  <input 
                    type="date" 
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    disabled={disabled}
                    className={`w-full p-2 border rounded ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
                    placeholder="To"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button 
              onClick={resetFilters}
              disabled={disabled}
              className={`rounded-md border-0 transition-colors flex items-center justify-center font-medium text-sm h-10 px-4 mr-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ 
                background: 'var(--card-bg)', 
                color: 'var(--foreground)',
                border: '1px solid var(--border-color)'
              }}
            >
              Reset
            </button>
            <button 
              onClick={applyFilters}
              disabled={disabled}
              className={`rounded-md border-0 transition-colors flex items-center justify-center font-medium text-sm h-10 px-4 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ 
                background: 'var(--primary-blue)', 
                color: 'white'
              }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
