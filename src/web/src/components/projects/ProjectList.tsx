import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useIntersectionObserver } from 'react-intersection-observer'; // ^9.0.0
import { useVirtualizer } from '@tanstack/react-virtual'; // ^3.0.0
import { ProjectCard, ProjectCardProps } from './ProjectCard';
import useDebounce from '../../hooks/useDebounce';
import { IProject, IProjectFilter, ProjectStatus } from '../../interfaces/project.interface';
import styles from './ProjectList.module.css';

interface ProjectListProps {
  initialFilter?: Partial<IProjectFilter>;
  onProjectSelect?: (project: IProject) => void;
  className?: string;
  isCompact?: boolean;
}

// Default filter values
const DEFAULT_FILTER: IProjectFilter = {
  page: 1,
  limit: 20,
  sortBy: 'updatedAt',
  sortOrder: 'desc'
};

// Constants for performance optimization
const DEBOUNCE_DELAY = 300;
const INTERSECTION_THRESHOLD = 0.5;
const VIRTUAL_OVERSCAN = 5;

export const ProjectList: React.FC<ProjectListProps> = React.memo(({
  initialFilter,
  onProjectSelect,
  className,
  isCompact = false
}) => {
  // State management
  const [projects, setProjects] = useState<IProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<IProjectFilter>({
    ...DEFAULT_FILTER,
    ...initialFilter
  });
  const [totalProjects, setTotalProjects] = useState(0);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  // Debounce filter changes
  const debouncedFilter = useDebounce(filter, DEBOUNCE_DELAY);

  // Virtual list setup
  const virtualizer = useVirtualizer({
    count: projects.length,
    getScrollElement: () => containerRef,
    estimateSize: useCallback(() => 200, []),
    overscan: VIRTUAL_OVERSCAN
  });

  // Intersection observer for infinite loading
  const { ref: loadMoreRef, inView } = useIntersectionObserver({
    threshold: INTERSECTION_THRESHOLD,
    rootMargin: '100px'
  });

  // Memoized virtual items
  const virtualItems = useMemo(() => 
    virtualizer.getVirtualItems(),
    [virtualizer]
  );

  // Fetch projects with error handling and retries
  const fetchProjects = useCallback(async (currentFilter: IProjectFilter) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(currentFilter)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      
      setProjects(prevProjects => 
        currentFilter.page === 1 
          ? data.projects 
          : [...prevProjects, ...data.projects]
      );
      setTotalProjects(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilter: Partial<IProjectFilter>) => {
    setFilter(prevFilter => ({
      ...prevFilter,
      ...newFilter,
      page: 1 // Reset pagination when filter changes
    }));
  }, []);

  // Load more projects when scrolling
  const loadMore = useCallback(() => {
    if (!loading && projects.length < totalProjects) {
      setFilter(prevFilter => ({
        ...prevFilter,
        page: prevFilter.page + 1
      }));
    }
  }, [loading, projects.length, totalProjects]);

  // Effect for initial and filter-based fetching
  useEffect(() => {
    fetchProjects(debouncedFilter);
  }, [debouncedFilter, fetchProjects]);

  // Effect for infinite loading
  useEffect(() => {
    if (inView) {
      loadMore();
    }
  }, [inView, loadMore]);

  // Memoized project card renderer
  const renderProjectCard = useCallback((project: IProject) => (
    <ProjectCard
      key={project.id}
      project={project}
      onClick={onProjectSelect ? () => onProjectSelect(project) : undefined}
      isCompact={isCompact}
      variant="elevated"
      className={styles.projectCard}
    />
  ), [onProjectSelect, isCompact]);

  // Filter controls component
  const FilterControls = useMemo(() => (
    <div className={styles.filterControls}>
      <select
        value={filter.status}
        onChange={(e) => handleFilterChange({ status: e.target.value as ProjectStatus })}
        className={styles.filterSelect}
      >
        <option value="">All Statuses</option>
        {Object.values(ProjectStatus).map(status => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>

      <select
        value={filter.priority}
        onChange={(e) => handleFilterChange({ priority: e.target.value as 'low' | 'medium' | 'high' })}
        className={styles.filterSelect}
      >
        <option value="">All Priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <input
        type="text"
        placeholder="Search projects..."
        value={filter.name || ''}
        onChange={(e) => handleFilterChange({ name: e.target.value })}
        className={styles.searchInput}
      />
    </div>
  ), [filter, handleFilterChange]);

  return (
    <div className={`${styles.projectList} ${className || ''}`}>
      {FilterControls}

      {error && (
        <div className={styles.error} role="alert">
          {error}
          <button onClick={() => fetchProjects(filter)} className={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      <div
        ref={setContainerRef}
        className={styles.projectsContainer}
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        <div
          style={{
            transform: `translateY(${virtualItems[0]?.start ?? 0}px)`
          }}
        >
          {virtualItems.map(virtualItem => (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualItem.index === projects.length - 1 ? loadMoreRef : undefined}
              className={styles.projectItem}
            >
              {renderProjectCard(projects[virtualItem.index])}
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <div className={styles.loading} role="status">
          Loading projects...
        </div>
      )}
    </div>
  );
});

ProjectList.displayName = 'ProjectList';

export default ProjectList;

// CSS Module
const styles = {
  projectList: `
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  `,
  filterControls: `
    display: flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--color-background);
    border-radius: var(--border-radius-lg);
    flex-wrap: wrap;

    @media (max-width: var(--breakpoint-sm)) {
      flex-direction: column;
    }
  `,
  filterSelect: `
    padding: var(--spacing-xs) var(--spacing-sm);
    border: var(--border-width-thin) solid var(--color-border);
    border-radius: var(--border-radius-md);
    background: var(--color-background);
    min-width: 150px;
  `,
  searchInput: `
    padding: var(--spacing-xs) var(--spacing-sm);
    border: var(--border-width-thin) solid var(--color-border);
    border-radius: var(--border-radius-md);
    flex: 1;
    min-width: 200px;
  `,
  projectsContainer: `
    position: relative;
    overflow-y: auto;
    flex: 1;
  `,
  projectItem: `
    padding: var(--spacing-sm);
  `,
  projectCard: `
    transition: transform var(--transition-fast);
    
    &:hover {
      transform: translateY(-2px);
    }
  `,
  loading: `
    padding: var(--spacing-md);
    text-align: center;
    color: var(--color-text-secondary);
  `,
  error: `
    padding: var(--spacing-md);
    background: var(--color-error-light);
    color: var(--color-error);
    border-radius: var(--border-radius-md);
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,
  retryButton: `
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-error);
    color: var(--color-white);
    border: none;
    border-radius: var(--border-radius-md);
    cursor: pointer;
    
    &:hover {
      background: var(--color-error-dark);
    }
  `
} as const;