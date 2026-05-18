'use client';

import { useState, useCallback, ReactNode } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
} from '@tanstack/react-table';
import { useUIStore } from '@/stores/uiStore';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  pageSize?: number;
  showToolbar?: boolean;
  showPagination?: boolean;
  showDensityToggle?: boolean;
  showColumnToggle?: boolean;
  rowHeight?: number;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  toolbar?: ReactNode;
  emptyMessage?: string;
}

export function DataTable<T extends { id?: string }>({
  data,
  columns,
  pageSize = 50,
  showToolbar = true,
  showPagination = true,
  showDensityToggle = true,
  showColumnToggle = true,
  rowHeight = 40,
  onRowClick,
  isLoading,
  toolbar,
  emptyMessage = 'No data found.',
}: DataTableProps<T>) {
  const { tableDensity, setTableDensity } = useUIStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const heightClass = tableDensity === 'compact' ? 'row-density-compact' : 'row-density-default';
  const actualRowHeight = tableDensity === 'compact' ? 32 : 40;

  return (
    <div className="flex flex-col gap-0">
      {/* Toolbar */}
      {showToolbar && (
        <div
          className="flex items-center justify-between gap-2 px-4 border border-b-0 border-border rounded-t-lg bg-bg-surface"
          style={{ height: 40, minHeight: 40 }}
        >
          <div className="flex items-center gap-2">
            {/* Global search */}
            <input
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search..."
              className="input text-xs"
              style={{ width: 180 }}
            />
            {toolbar}
          </div>

          <div className="flex items-center gap-2">
            {/* Density toggle */}
            {showDensityToggle && (
              <div className="flex items-center border border-border rounded overflow-hidden">
                <button
                  className={`px-2 py-1 text-[10px] transition-colors ${tableDensity === 'compact' ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-text-muted hover:bg-bg-elevated'}`}
                  onClick={() => setTableDensity('compact')}
                >
                  Compact
                </button>
                <button
                  className={`px-2 py-1 text-[10px] transition-colors border-l border-border ${tableDensity === 'default' ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-text-muted hover:bg-bg-elevated'}`}
                  onClick={() => setTableDensity('default')}
                >
                  Default
                </button>
              </div>
            )}

            {/* Column toggle */}
            {showColumnToggle && (
              <div className="relative group">
                <button className="btn btn-secondary btn-sm text-xs">
                  Columns
                </button>
                <div className="hidden group-hover:block absolute right-0 top-full mt-1 z-20 bg-bg-surface border border-border rounded shadow-lg p-2 min-w-[160px]">
                  <label className="flex items-center gap-2 py-1 text-xs cursor-pointer hover:bg-bg-elevated">
                    <input
                      type="checkbox"
                      checked={table.getIsAllColumnsVisible()}
                      onChange={table.getToggleAllColumnsVisibilityHandler()}
                      className="accent-primary-500"
                    />
                    Select All
                  </label>
                  {table.getAllLeafColumns().map((column) => (
                    <label key={column.id} className="flex items-center gap-2 py-1 text-xs cursor-pointer hover:bg-bg-elevated pl-4">
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="accent-primary-500"
                      />
                      {String(column.columnDef.header || column.id)}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Refresh */}
            <button
              className="btn btn-secondary btn-sm text-xs"
              onClick={() => table.reset()}
            >
              ↻
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-container rounded-t-none border-t-0" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {isLoading && (
          <div className="refreshing" />
        )}
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border bg-table-header">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wide"
                    style={{ width: header.getSize(), position: header.index === 0 ? 'sticky' : undefined, left: header.index === 0 ? 0 : undefined, background: header.index === 0 ? 'var(--table-header)' : undefined, zIndex: header.index === 0 ? 2 : 1 }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center gap-1 ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() && (
                          <span className="text-primary-500">
                            {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-text-muted text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className={`border-b border-border hover:bg-table-hover cursor-pointer ${rowIndex % 2 === 1 ? 'bg-table-row-alt' : ''}`}
                  style={{ height: actualRowHeight }}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <td
                      key={cell.id}
                      className="px-3 py-1 text-xs"
                      style={{
                        width: cell.column.getSize(),
                        maxWidth: cell.column.getSize(),
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: cell.column.id === 'actions' ? 'nowrap' : 'normal',
                        position: cellIndex === 0 ? 'sticky' : undefined,
                        left: cellIndex === 0 ? 0 : undefined,
                        background: cellIndex === 0 ? (rowIndex % 2 === 1 ? 'var(--table-row-alt)' : 'var(--bg-surface)') : undefined,
                        zIndex: cellIndex === 0 ? 1 : 0,
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div
          className="flex items-center justify-between px-4 border border-t-0 border-border rounded-b-lg bg-bg-surface"
          style={{ height: 40 }}
        >
          <div className="text-xs text-text-muted">
            {table.getFilteredRowModel().rows.length} of {data.length} rows
            {Object.keys(rowSelection).length > 0 && ` (${Object.keys(rowSelection).length} selected)`}
          </div>

          <div className="flex items-center gap-2">
            <select
              className="select text-xs"
              style={{ width: 80 }}
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {[20, 50, 100, 200].map((size) => (
                <option key={size} value={size}>{size} / page</option>
              ))}
            </select>

            <button
              className="btn btn-secondary btn-sm text-xs"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              ←
            </button>
            <span className="text-xs text-text-muted">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <button
              className="btn btn-secondary btn-sm text-xs"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}