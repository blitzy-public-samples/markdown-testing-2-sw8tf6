import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { FixedSizeList } from 'react-window';
import classNames from 'classnames';
import { Pagination } from './Pagination';
import { Loading } from './Loading';
import { Tooltip } from './Tooltip';

// Types and Interfaces
export interface ColumnDefinition<T = any> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  headerTooltip?: string;
  cellRenderer?: (value: any, row: T) => React.ReactNode;
}

export interface TableProps<T = any> {
  /** Data array to be displayed in the table */
  data: T[];
  /** Column definitions for the table */
  columns: ColumnDefinition<T>[];
  /** Loading state indicator */
  loading?: boolean;
  /** Enable row selection */
  selectable?: boolean;
  /** Currently selected row keys */
  selectedKeys?: string[];
  /** Key field for row identification */
  rowKey?: keyof T | ((row: T) => string);
  /** Pagination configuration */
  pagination?: {
    currentPage: number;
    pageSize: number;
    total: number;
    onChange: (page: number) => void;
  };
  /** Virtualization configuration for large datasets */
  virtualization?: {
    enabled: boolean;
    rowHeight: number;
    overscan?: number;
  };
  /** Sort configuration */
  sort?: {
    column?: string;
    direction?: 'asc' | 'desc';
    onChange?: (column: string, direction: 'asc' | 'desc') => void;
  };
  /** Empty state content */
  emptyContent?: React.ReactNode;
  /** Additional CSS class name */
  className?: string;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Row selection change handler */
  onSelectionChange?: (selectedKeys: string[]) => void;
}

export const Table = <T extends object>({
  data,
  columns,
  loading = false,
  selectable = false,
  selectedKeys = [],
  rowKey = 'id',
  pagination,
  virtualization,
  sort,
  emptyContent,
  className,
  onRowClick,
  onSelectionChange,
}: TableProps<T>) => {
  const [hoveredRowKey, setHoveredRowKey] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<FixedSizeList>(null);

  // Compute row key for a given row
  const getRowKey = useCallback((row: T): string => {
    return typeof rowKey === 'function' ? rowKey(row) : String(row[rowKey]);
  }, [rowKey]);

  // Handle sort column click
  const handleSort = useCallback((columnId: string) => {
    if (!sort?.onChange) return;

    const newDirection = sort.column === columnId && sort.direction === 'asc' ? 'desc' : 'asc';
    sort.onChange(columnId, newDirection);
  }, [sort]);

  // Handle row selection
  const handleRowSelect = useCallback((rowKey: string, checked: boolean) => {
    if (!onSelectionChange) return;

    const newSelectedKeys = checked
      ? [...selectedKeys, rowKey]
      : selectedKeys.filter(key => key !== rowKey);
    onSelectionChange(newSelectedKeys);
  }, [selectedKeys, onSelectionChange]);

  // Render table header
  const renderHeader = useMemo(() => (
    <div className="table-header" role="rowgroup">
      <div className="table-row" role="row">
        {selectable && (
          <div className="table-cell header-cell checkbox-cell" role="columnheader">
            <input
              type="checkbox"
              checked={data.length > 0 && selectedKeys.length === data.length}
              indeterminate={selectedKeys.length > 0 && selectedKeys.length < data.length}
              onChange={e => {
                const checked = e.target.checked;
                onSelectionChange?.(checked ? data.map(getRowKey) : []);
              }}
              aria-label="Select all rows"
            />
          </div>
        )}
        {columns.map(column => (
          <div
            key={column.id}
            className={classNames('table-cell header-cell', {
              'sortable': column.sortable,
              'sorted': sort?.column === column.id,
              [`align-${column.align || 'left'}`]: true
            })}
            style={{
              width: column.width,
              minWidth: column.minWidth,
              maxWidth: column.maxWidth
            }}
            role="columnheader"
            aria-sort={sort?.column === column.id ? sort.direction : undefined}
            onClick={() => column.sortable && handleSort(column.id)}
          >
            {column.headerTooltip ? (
              <Tooltip content={column.headerTooltip}>
                <span>{column.header}</span>
              </Tooltip>
            ) : (
              <span>{column.header}</span>
            )}
            {column.sortable && sort?.column === column.id && (
              <span className={`sort-indicator ${sort.direction}`} aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </div>
  ), [columns, selectable, sort, data, selectedKeys, handleSort, onSelectionChange, getRowKey]);

  // Render table row
  const renderRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const row = data[index];
    const rowKey = getRowKey(row);
    const isSelected = selectedKeys.includes(rowKey);
    const isHovered = hoveredRowKey === rowKey;

    return (
      <div
        className={classNames('table-row', {
          'selected': isSelected,
          'hovered': isHovered
        })}
        style={style}
        role="row"
        aria-selected={isSelected}
        onClick={() => onRowClick?.(row)}
        onMouseEnter={() => setHoveredRowKey(rowKey)}
        onMouseLeave={() => setHoveredRowKey(null)}
      >
        {selectable && (
          <div className="table-cell checkbox-cell" role="cell">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={e => handleRowSelect(rowKey, e.target.checked)}
              onClick={e => e.stopPropagation()}
              aria-label={`Select row ${index + 1}`}
            />
          </div>
        )}
        {columns.map(column => (
          <div
            key={column.id}
            className={classNames('table-cell', `align-${column.align || 'left'}`)}
            role="cell"
            style={{
              width: column.width,
              minWidth: column.minWidth,
              maxWidth: column.maxWidth
            }}
          >
            {column.cellRenderer
              ? column.cellRenderer(
                  typeof column.accessor === 'function'
                    ? column.accessor(row)
                    : row[column.accessor],
                  row
                )
              : typeof column.accessor === 'function'
                ? column.accessor(row)
                : row[column.accessor]
            }
          </div>
        ))}
      </div>
    );
  }, [data, columns, selectedKeys, hoveredRowKey, selectable, onRowClick, handleRowSelect, getRowKey]);

  // Empty state
  if (!loading && data.length === 0) {
    return (
      <div className={classNames('table-empty', className)} role="table" aria-label="Empty table">
        {emptyContent || <p>No data available</p>}
      </div>
    );
  }

  return (
    <div className={classNames('table-container', className)}>
      <div
        ref={tableRef}
        className="table"
        role="table"
        aria-busy={loading}
        aria-rowcount={data.length}
        aria-colcount={columns.length}
      >
        {renderHeader}
        
        {loading ? (
          <div className="table-loading">
            <Loading size="medium" />
          </div>
        ) : virtualization?.enabled ? (
          <FixedSizeList
            ref={listRef}
            height={400} // Consider making this configurable
            itemCount={data.length}
            itemSize={virtualization.rowHeight}
            width="100%"
            overscanCount={virtualization.overscan || 5}
          >
            {renderRow}
          </FixedSizeList>
        ) : (
          <div className="table-body" role="rowgroup">
            {data.map((_, index) => renderRow({ index, style: {} }))}
          </div>
        )}
      </div>

      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={Math.ceil(pagination.total / pagination.pageSize)}
          onPageChange={pagination.onChange}
        />
      )}
    </div>
  );
};

export default Table;