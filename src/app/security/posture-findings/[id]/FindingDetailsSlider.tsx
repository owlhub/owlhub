"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Table from "@/src/components/Table";

interface FindingDetail {
  id: string;
  description: string;
  hidden: boolean;
  additionalInfo: string;
  createdAt: string | Date;
}

interface FindingDetailsSliderProps {
  findingDetails: Array<FindingDetail>;
  onCountsUpdate: (activeCount: number, hiddenCount: number) => void;
  activeTab: 'active' | 'hidden';
  onRefreshData: () => void;
}

export default function FindingDetailsSlider({ 
  findingDetails: initialFindingDetails,
  onCountsUpdate,
  activeTab,
  onRefreshData
}: FindingDetailsSliderProps) {
  const [findingDetails, setFindingDetails] = useState<FindingDetail[]>(initialFindingDetails);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<FindingDetail | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [bulkActionDropdownOpen, setBulkActionDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFindings, setSelectedFindings] = useState<FindingDetail[]>([]);

  // Update internal state when initialFindingDetails changes
  useEffect(() => {
    setFindingDetails(initialFindingDetails);
    setSelectedFindings([]);
  }, [initialFindingDetails]);

  // Click outside handler for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Close individual dropdown when clicking outside
      if (activeDropdown !== null) {
        const dropdownElement = document.getElementById(`dropdown-${activeDropdown}`);
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setActiveDropdown(null);
        }
      }

      // Close bulk action dropdown when clicking outside
      const bulkDropdownElement = document.getElementById('bulk-action-dropdown');
      if (bulkActionDropdownOpen && bulkDropdownElement && !bulkDropdownElement.contains(event.target as Node)) {
        setBulkActionDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeDropdown, bulkActionDropdownOpen]);

  const openSlider = (finding: FindingDetail) => {
    setSelectedFinding(finding);
    setIsOpen(true);
  };

  const closeSlider = () => {
    setIsOpen(false);
    setSelectedFinding(null);
  };

  const toggleDropdown = (id: string) => {
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  const toggleBulkActionDropdown = () => {
    setBulkActionDropdownOpen(!bulkActionDropdownOpen);
  };

  const handleSelectionChange = useCallback((selected: FindingDetail[]) => {
    setSelectedFindings(selected);
  }, []);

  const toggleStatus = async (finding: FindingDetail) => {
    try {
      console.log('Toggling status for finding:', finding.id, 'Current hidden status:', finding.hidden);
      setIsLoading(true);
      setActiveDropdown(null);

      const newHiddenStatus = !finding.hidden;
      console.log('New hidden status:', newHiddenStatus);

      // Update the finding in the local state first for immediate feedback
      setFindingDetails(prevDetails => 
        prevDetails.map(detail => 
          detail.id === finding.id 
            ? { ...detail, hidden: newHiddenStatus } 
            : detail
        )
      );

      // If the slider is open and the selected finding is the one being updated, update it
      if (selectedFinding && selectedFinding.id === finding.id) {
        setSelectedFinding({ ...selectedFinding, hidden: newHiddenStatus });
      }

      // Then make the API call
      const response = await fetch('/api/security/posture-findings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          findingId: finding.id,
          hidden: newHiddenStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update finding status');
      }

      const data = await response.json();
      console.log('Response data:', data);

      // Update the counts in the parent component
      if (data.activeCount !== undefined && data.hiddenCount !== undefined) {
        onCountsUpdate(data.activeCount, data.hiddenCount);
      }

      // Refresh the data to ensure we have the latest state
      onRefreshData();
    } catch (error) {
      console.error('Error updating finding status:', error);
      alert('Failed to update finding status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const bulkToggleStatus = async (toHidden: boolean) => {
    if (selectedFindings.length === 0) return;

    try {
      setIsLoading(true);

      // Update the findings in the local state first for immediate feedback
      const updatedFindings = findingDetails.map(detail => {
        if (selectedFindings.some(selected => selected.id === detail.id)) {
          return { ...detail, hidden: toHidden };
        }
        return detail;
      });

      setFindingDetails(updatedFindings);

      // If the slider is open and the selected finding is one of the updated ones, update it
      if (selectedFinding && selectedFindings.some(selected => selected.id === selectedFinding.id)) {
        setSelectedFinding({ ...selectedFinding, hidden: toHidden });
      }

      // Make the API call
      const response = await fetch('/api/security/posture-findings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          findingIds: selectedFindings.map(finding => finding.id),
          hidden: toHidden,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update findings status');
      }

      const data = await response.json();

      // Update the counts in the parent component
      if (data.activeCount !== undefined && data.hiddenCount !== undefined) {
        onCountsUpdate(data.activeCount, data.hiddenCount);
      }

      // Refresh the data to ensure we have the latest state
      onRefreshData();

      // Clear selection after successful update
      setSelectedFindings([]);
    } catch (error) {
      console.error('Error updating findings status:', error);
      alert('Failed to update findings status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    {
      header: "Description",
      accessor: (finding: FindingDetail) => (
        <span 
          className="cursor-pointer text-blue-600 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            openSlider(finding);
          }}
        >
          {finding.description}
        </span>
      ),
      sortable: true,
      width: "60%",
    },
    // {
    //   header: "Status",
    //   accessor: (finding: FindingDetail) => (
    //     <span
    //       className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    //       style={{
    //         background: finding.hidden ? 'rgba(107, 114, 128, 0.1)' : 'rgba(220, 38, 38, 0.1)',
    //         color: finding.hidden ? 'rgb(107, 114, 128)' : 'rgb(220, 38, 38)'
    //       }}
    //     >
    //       {finding.hidden ? 'Hidden' : 'Active'}
    //     </span>
    //   ),
    //   sortable: false,
    //   sortKey: "hidden" as keyof FindingDetail,
    //   width: "15%",
    // },
    {
      header: "Created At",
      accessor: (finding: FindingDetail) => {
        const date = new Date(finding.createdAt);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      },
      sortable: true,
      sortKey: "createdAt" as keyof FindingDetail,
      width: "25%",
    },
    {
      header: "",
      accessor: (finding: FindingDetail) => (
        <div className="relative" id={`dropdown-${finding.id}`}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Dropdown button clicked for finding:', finding.id);
              toggleDropdown(finding.id);
              return false; // Ensure no further propagation
            }}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-500 focus:outline-none"
            disabled={isLoading}
            aria-label="Actions"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {activeDropdown === finding.id && (
            <div 
              className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-1">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Button clicked for finding:', finding.id);
                    toggleStatus(finding);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-200 focus:outline-none"
                  disabled={isLoading}
                >
                  {activeTab === 'active' ? 'Move to Hidden' : 'Move to Active'}
                </button>
              </div>
            </div>
          )}
        </div>
      ),
      width: "15%",
    },
  ];

  return (
    <>
      {/* Selection info and bulk actions - always visible to prevent layout shift */}
      <div className="h-10 mb-4 flex justify-between items-center">
        {selectedFindings.length > 0 ? (
            <div className="relative" id="bulk-action-dropdown">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleBulkActionDropdown();
                }}
                className="px-3 py-1.5 border border-solid bg-white text-[var(--primary-blue)] rounded hover:bg-[#dcebff] flex items-center gap-1 focus:outline-none"
                disabled={isLoading}
                aria-label="Actions"
              >
                <span>Actions</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {bulkActionDropdownOpen && (
                <div 
                  className="absolute left-0 mt-1 w-max bg-white rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="py-1 w-full">
                    {/* Status change actions - conditional based on active tab */}
                    {activeTab === 'hidden' && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          bulkToggleStatus(false);
                          setBulkActionDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-200 focus:outline-none"
                        disabled={isLoading}
                      >
                        Move to Active ({selectedFindings.length} selected)
                      </button>
                    )}
                    {activeTab === 'active' && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          bulkToggleStatus(true);
                          setBulkActionDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-200 focus:outline-none"
                        disabled={isLoading}
                      >
                        Move to Hidden ({selectedFindings.length} selected)
                      </button>
                    )}

                    {/* Divider for separating different types of actions */}
                    {/*
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                    */}

                    {/* Additional bulk actions can be added here */}
                    {/* Example:
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Handle the action
                        setBulkActionDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-200 focus:outline-none"
                      disabled={isLoading}
                    >
                      Another Action
                    </button>
                    */}
                  </div>
                </div>
              )}
            </div>
        ) : (
          <div></div> /* Empty div to maintain height when no selections */
        )}
      </div>

      {/* Table with clickable descriptions */}
      <Table
        data={findingDetails.filter(finding => 
          activeTab === 'active' ? !finding.hidden : finding.hidden
        )}
        columns={columns}
        keyExtractor={(finding) => finding.id}
        defaultRowsPerPage={50}
        emptyMessage={`No ${activeTab} findings available`}
        className="overflow-x-auto"
        onRowClick={null} // Disable row clicks to prevent interference with dropdown
        selectable={true}
        onSelectionChange={handleSelectionChange}
        selectedItems={selectedFindings}
      />

      {/* Right Slider */}
      {isOpen && selectedFinding && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={closeSlider}>
          <div 
            className="bg-white dark:bg-gray-800 h-full w-full md:w-1/2 lg:w-1/3 shadow-xl overflow-y-auto transform transition-transform duration-300 ease-in-out" 
            style={{ 
              background: 'var(--card-bg)', 
              color: 'var(--foreground)',
              borderLeft: '1px solid var(--border-color)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Finding Details</h2>
                <button 
                  onClick={closeSlider}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="mb-4">{selectedFinding.description}</p>

                <div className="flex items-center mb-4">
                  <span className="mr-4">
                    <span className="font-semibold">Status:</span>{' '}
                    <span 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" 
                      style={{ 
                        background: selectedFinding.hidden ? 'rgba(107, 114, 128, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                        color: selectedFinding.hidden ? 'rgb(107, 114, 128)' : 'rgb(220, 38, 38)'
                      }}
                    >
                      {selectedFinding.hidden ? 'Hidden' : 'Active'}
                    </span>
                  </span>
                  <span>
                    <span className="font-semibold">Created:</span>{' '}
                    {(() => {
                      const date = new Date(selectedFinding.createdAt);
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const hours = String(date.getHours()).padStart(2, '0');
                      const minutes = String(date.getMinutes()).padStart(2, '0');
                      const seconds = String(date.getSeconds()).padStart(2, '0');
                      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                    })()}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Additional Information</h3>
                <div className="overflow-x-auto">
                  <pre 
                    className="p-4 rounded text-sm overflow-auto" 
                    style={{ 
                      maxHeight: '400px',
                      background: 'var(--card-bg-secondary)', 
                      color: 'var(--foreground)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    {JSON.stringify(JSON.parse(selectedFinding.additionalInfo), null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
