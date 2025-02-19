import React, { useMemo } from 'react';
import classNames from 'classnames';
import { Button } from './Button';
import styles from './Pagination.module.css';

export interface PaginationProps {
  /** Current active page number (1-based) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback function when page changes */
  onPageChange: (page: number) => void;
  /** Maximum number of visible page numbers */
  maxVisiblePages?: number;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Generates an array of page numbers to display with ellipsis
 */
const getPageNumbers = (
  currentPage: number,
  totalPages: number,
  maxVisiblePages: number
): (number | string)[] => {
  return useMemo(() => {
    // Handle invalid inputs
    if (totalPages <= 0) return [];
    if (currentPage < 1) return [];
    if (currentPage > totalPages) return [];

    const pages: (number | string)[] = [];
    const ellipsis = '...';
    
    // For small number of pages, show all
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    pages.push(1);

    // Calculate start and end of visible pages
    let start = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2));
    let end = Math.min(totalPages - 1, start + maxVisiblePages - 3);
    
    // Adjust start if end is too close to totalPages
    start = Math.max(2, Math.min(start, totalPages - maxVisiblePages + 2));

    // Add ellipsis after first page if needed
    if (start > 2) {
      pages.push(ellipsis);
    }

    // Add visible page numbers
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Add ellipsis before last page if needed
    if (end < totalPages - 1) {
      pages.push(ellipsis);
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages, maxVisiblePages]);
};

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 7,
  className
}) => {
  const pageNumbers = getPageNumbers(currentPage, totalPages, maxVisiblePages);

  // Handle page change with bounds checking
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent, page: number) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePageChange(currentPage - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handlePageChange(currentPage + 1);
    }
  };

  if (totalPages <= 1) return null;

  return (
    <nav
      className={classNames(styles.pagination, className)}
      role="navigation"
      aria-label="Pagination"
    >
      <div className={styles.paginationControls}>
        {/* Previous page button */}
        <Button
          variant="ghost"
          size="sm"
          isDisabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
          aria-label="Previous page"
          className={styles.paginationButton}
        >
          <span aria-hidden="true">&lt;</span>
        </Button>

        {/* Page numbers */}
        <div className={styles.pageNumbers}>
          {pageNumbers.map((page, index) => {
            const isEllipsis = page === '...';
            const isCurrentPage = page === currentPage;

            return (
              <React.Fragment key={`${page}-${index}`}>
                {isEllipsis ? (
                  <span className={styles.ellipsis} aria-hidden="true">
                    {page}
                  </span>
                ) : (
                  <Button
                    variant={isCurrentPage ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handlePageChange(Number(page))}
                    aria-current={isCurrentPage ? 'page' : undefined}
                    aria-label={`Page ${page}`}
                    onKeyDown={(e) => handleKeyDown(e, Number(page))}
                    className={styles.pageButton}
                  >
                    {page}
                  </Button>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Next page button */}
        <Button
          variant="ghost"
          size="sm"
          isDisabled={currentPage === totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
          aria-label="Next page"
          className={styles.paginationButton}
        >
          <span aria-hidden="true">&gt;</span>
        </Button>
      </div>

      {/* Mobile-optimized select for smaller screens */}
      <select
        className={styles.mobileSelect}
        value={currentPage}
        onChange={(e) => handlePageChange(Number(e.target.value))}
        aria-label="Select page"
      >
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <option key={page} value={page}>
            Page {page} of {totalPages}
          </option>
        ))}
      </select>
    </nav>
  );
};

// CSS Module styles
const styles = {
  pagination: `
    display: flex;
    align-items: center;
    justify-content: center;
    margin: var(--spacing-md) 0;
    font-family: var(--font-family-primary);
  `,

  paginationControls: `
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);

    @media (max-width: var(--breakpoint-sm)) {
      display: none;
    }
  `,

  pageNumbers: `
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  `,

  paginationButton: `
    min-width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    
    &:focus-visible {
      outline: var(--border-width-medium) solid var(--color-focus-ring);
      outline-offset: 2px;
    }
  `,

  pageButton: `
    min-width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    font-size: var(--font-size-sm);
    
    &:focus-visible {
      outline: var(--border-width-medium) solid var(--color-focus-ring);
      outline-offset: 2px;
    }
  `,

  ellipsis: `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.5rem;
    height: 2.5rem;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  `,

  mobileSelect: `
    display: none;
    width: 100%;
    max-width: 200px;
    height: 2.5rem;
    padding: 0 var(--spacing-sm);
    font-family: var(--font-family-primary);
    font-size: var(--font-size-sm);
    border: var(--border-width-thin) solid var(--color-border);
    border-radius: var(--border-radius-md);
    background-color: var(--color-background);
    color: var(--color-text-primary);
    cursor: pointer;

    @media (max-width: var(--breakpoint-sm)) {
      display: block;
    }

    &:focus {
      outline: var(--border-width-medium) solid var(--color-focus-ring);
      outline-offset: 2px;
    }
  `,
} as const;