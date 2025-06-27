"use client";

import React, { useState, ReactNode, useMemo, useEffect } from "react";

/**
 * Table component with pagination support, sorting functionality, and optional row selection
 * 
 * @template T - The type of data to be displayed in the table
 * 
 * @example
 * ```tsx
 * <Table
 *   data={users}
 *   columns={[
 *     {
 *       header: "Name",
 *       accessor: "name",
 *       sortable: true,
 *     },
 *     {
 *       header: "Email",
 *       accessor: "email",
 *       sortable: true,
 *     },
 *     {
 *       header: "Status",
 *       accessor: (user) => (
 *         <span className={user.isActive ? "active" : "inactive"}>
 *           {user.isActive ? "Active" : "Inactive"}
 *         </span>
 *       ),
 *       sortKey: "isActive",
 *       sortable: true,
 *     },
 *   ]}
 *   onRowClick={(user) => router.push(`/users/${user.id}`)}
 *   keyExtractor={(user) => user.id}
 *   defaultRowsPerPage={10}
 *   selectable={true}
 *   onSelectionChange={(selectedItems) => console.log(selectedItems)}
 * />
 * ```
 */
interface TableProps<T> {
  /** The data to be displayed in the table */
  data: T[];

  /** Column definitions for the table */
  columns: {
    /** The header text for the column */
    header: string;

    /** 
     * The accessor for the column data
     * Can be a key of T or a function that returns a ReactNode
     */
    accessor: keyof T | ((item: T) => ReactNode);

    /** Optional CSS class name for the column */
    className?: string;

    /** Whether this column is sortable */
    sortable?: boolean;

    /** 
     * Optional key to use for sorting when accessor is a function
     * If not provided and accessor is a function, column won't be sortable
     */
    sortKey?: keyof T;

    /** 
     * Optional width for the column (e.g., '150px', '20%')
     * Used to maintain consistent column widths
     */
    width?: string;
  }[];

  /** Number of rows per page */
  defaultRowsPerPage?: number;

  /** Callback function when a row is clicked */
  onRowClick?: (item: T) => void;

  /** Function to extract a unique key from each item */
  keyExtractor: (item: T) => string | number;

  /** Optional CSS class name for the table container */
  className?: string;

  /** Message to display when there is no data */
  emptyMessage?: string;

  /** Whether to show checkboxes for row selection */
  selectable?: boolean;

  /** Callback function when selection changes */
  onSelectionChange?: (selectedItems: T[]) => void;

  /** Selected items (for controlled selection) */
  selectedItems?: T[];
}

export default function Table<T>({
  data,
  columns,
  defaultRowsPerPage = 10,
  onRowClick,
  keyExtractor,
  className = "",
  emptyMessage = "No data available",
  selectable = false,
  onSelectionChange,
  selectedItems
}: TableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | null;
    direction: 'ascending' | 'descending' | null;
  }>({ key: null, direction: null });
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());
  const [selectAllState, setSelectAllState] = useState<'none' | 'all' | 'partial'>('none');

  // Create a ref to track previous selected items
  const prevSelectedItemIdsRef = React.useRef('');

  // Handle selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const selectedItems = data.filter(item => selectedRows.has(keyExtractor(item)));
      // Only call onSelectionChange if we have a callback
      // Use a ref to track previous selected items to avoid unnecessary calls
      const selectedItemIds = selectedItems.map(item => keyExtractor(item)).sort().join(',');

      // Only call onSelectionChange if the selection has actually changed
      if (selectedItemIds !== prevSelectedItemIdsRef.current) {
        prevSelectedItemIdsRef.current = selectedItemIds;
        onSelectionChange(selectedItems);
      }
    }
  }, [selectedRows, data, keyExtractor, onSelectionChange]);

  // Handle row selection
  const handleRowSelection = (item: T, isSelected: boolean) => {
    const key = keyExtractor(item);
    const newSelectedRows = new Set(selectedRows);

    if (isSelected) {
      newSelectedRows.add(key);
    } else {
      newSelectedRows.delete(key);
    }

    setSelectedRows(newSelectedRows);
  };



  // Update selectedRows when selectedItems prop changes
  useEffect(() => {
    if (selectedItems) {
      const newSelectedRows = new Set<string | number>();
      selectedItems.forEach(item => {
        newSelectedRows.add(keyExtractor(item));
      });
      setSelectedRows(newSelectedRows);
    }
  }, [selectedItems, keyExtractor]);

  // We don't reset selected rows when data changes
  // This allows selections to persist when navigating between pages

  // Handle sorting
  const handleSort = (columnIndex: number) => {
    const column = columns[columnIndex];

    // Check if column is sortable
    if (!column.sortable) return;

    // Determine the sort key
    const sortKey = typeof column.accessor === 'function' 
      ? column.sortKey 
      : column.accessor as keyof T;

    // If no sortKey is provided for a function accessor, we can't sort
    if (typeof column.accessor === 'function' && !column.sortKey) return;

    // Toggle sort direction or set to ascending if sorting a new column
    let direction: 'ascending' | 'descending' | null = 'ascending';

    if (sortConfig.key === sortKey) {
      if (sortConfig.direction === 'ascending') {
        direction = 'descending';
      } else if (sortConfig.direction === 'descending') {
        direction = null;
      }
    }

    setSortConfig({ key: sortKey as keyof T, direction });
  };

  // Sort data
  const sortedData = useMemo(() => {
    // If no sort config or direction is null, return original data
    if (!sortConfig.key || !sortConfig.direction) return [...data];

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof T];
      const bValue = b[sortConfig.key as keyof T];

      // Handle different types of values
      if (aValue === bValue) return 0;

      // Handle null/undefined values
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'ascending'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Handle strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'ascending'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Handle numbers and booleans
      return sortConfig.direction === 'ascending'
        ? (aValue < bValue ? -1 : 1)
        : (bValue < aValue ? -1 : 1);
    });
  }, [data, sortConfig]);

  // Calculate total pages
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  // Get current page data
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = sortedData.slice(startIndex, endIndex);

  // Handle "select all" for current page
  const handleSelectAllCurrentPage = () => {
    const currentPageKeys = currentData.map(item => keyExtractor(item));
    const newSelectedRows = new Set(selectedRows);

    if (selectAllState === 'all') {
      // Deselect all current page items
      currentPageKeys.forEach(key => newSelectedRows.delete(key));
    } else {
      // Select all current page items
      currentPageKeys.forEach(key => newSelectedRows.add(key));
    }

    setSelectedRows(newSelectedRows);
  };

  // Memoize the calculation of current page keys
  const currentPageKeys = useMemo(() => {
    return currentData.map(item => keyExtractor(item));
  }, [currentData, keyExtractor]);

  // Update select all state when page changes or selection changes
  useEffect(() => {
    if (!selectable) return;

    const selectedCurrentPageCount = currentPageKeys.filter(key => selectedRows.has(key)).length;

    let newState: 'none' | 'all' | 'partial';
    if (selectedCurrentPageCount === 0 && selectedRows.size === 0) {
      newState = 'none';
    } else if (selectedCurrentPageCount === currentPageKeys.length) {
      newState = 'all';
    } else {
      newState = 'partial';
    }

    // Only update state if it has changed
    if (newState !== selectAllState) {
      setSelectAllState(newState);
    }
  }, [currentPageKeys, selectedRows, selectable, selectAllState]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get sort direction indicator
  const getSortIndicator = (columnIndex: number) => {
    const column = columns[columnIndex];

    // If column is not sortable, return empty string
    if (!column.sortable) return '';

    // Determine the sort key
    const sortKey = typeof column.accessor === 'function' 
      ? column.sortKey 
      : column.accessor as keyof T;

    // If no sortKey is provided for a function accessor, we can't sort
    if (typeof column.accessor === 'function' && !column.sortKey) return '';

    // Return appropriate indicator based on current sort config
    if (sortConfig.key === sortKey) {
      return sortConfig.direction === 'ascending' ? ' ↑' : sortConfig.direction === 'descending' ? ' ↓' : ' ↕';
    }

    // Show up/down arrow for all sortable columns
    return ' ↕';
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-[var(--card-bg)] rounded-lg overflow-hidden border border-[var(--border-color)]">
          <thead className="bg-[var(--sidebar-hover)]">
            <tr>
              {selectable && (
                <th 
                  className="py-3 px-4 text-left w-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selectAllState === 'all'}
                      ref={input => {
                        if (input) {
                          input.indeterminate = selectAllState === 'partial';
                        }
                      }}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectAllCurrentPage();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                      aria-label="Select all rows"
                    />
                  </div>
                </th>
              )}
              {columns.map((column, index) => (
                <th 
                  key={index} 
                  className={`py-3 px-4 text-left ${column.className || ""} ${column.sortable ? 'cursor-pointer transition-colors duration-200' : ''}`}
                  onClick={() => handleSort(index)}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.header}{getSortIndicator(index)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {currentData.length > 0 ? (
              currentData.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  className={`hover:bg-[var(--sidebar-hover)] ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                >
                  {selectable && (
                    <td 
                      className="py-3 px-4 w-10"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(keyExtractor(item))}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleRowSelection(item, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                          aria-label={`Select row ${keyExtractor(item)}`}
                        />
                      </div>
                    </td>
                  )}
                  {columns.map((column, index) => {
                    const cellContent = typeof column.accessor === "function"
                      ? column.accessor(item)
                      : item[column.accessor] as ReactNode;

                    // Convert to string for tooltip and truncation
                    const contentStr = typeof cellContent === 'object' 
                      ? null // Don't apply truncation to complex React elements
                      : String(cellContent);

                    return (
                      <td 
                        key={index} 
                        className={`py-3 px-4 ${column.className || ""}`}
                        style={column.width ? { 
                          width: column.width,
                          maxWidth: column.width
                        } : undefined}
                      >
                        {contentStr !== null ? (
                          <div 
                            className="truncate"
                            title={contentStr} // This creates the tooltip on hover
                          >
                            {cellContent}
                          </div>
                        ) : (
                          // For complex React elements, render as is
                          cellContent
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={selectable ? columns.length + 1 : columns.length} 
                  className="py-4 px-4 text-center text-[var(--sidebar-text)] opacity-70"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
          <div className="flex items-center">
            <span className="text-sm text-[var(--sidebar-text)] opacity-70 mr-4">
              <b className="text-[var(--foreground)]">{startIndex + 1}-{Math.min(endIndex, data.length)}</b> of {data.length} items | Items per page: {rowsPerPage}
            </span>
          </div>

          <div className="flex items-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-1 disabled:opacity-50"
              aria-label="Previous page"
            >
              &lt;
            </button>

            <span className="px-3 py-1">
              {currentPage} of {totalPages} pages
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 disabled:opacity-50"
              aria-label="Next page"
            >
              &gt;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
