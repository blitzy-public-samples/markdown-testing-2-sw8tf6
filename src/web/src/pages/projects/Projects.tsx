import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { debounce } from 'lodash';
import { ProjectList } from '../../components/projects/ProjectList';
import { MainLayout } from '../../components/layout/MainLayout';
import { useWebSocket } from '../../hooks/useWebSocket';
import { IProject, IProjectFilter, ProjectStatus } from '../../interfaces/project.interface';
import { selectProjects, selectProjectLoading, selectProjectError } from '../../store/project/project.selectors';
import { fetchProjects, updateProject } from '../../store/project/project.actions';
import styles from './Projects.module.css';

const Projects: React.FC = () => {
  const dispatch = useDispatch();
  const projects = useSelector(selectProjects);
  const loading = useSelector(selectProjectLoading);
  const error = useSelector(selectProjectError);

  // WebSocket connection for real-time updates
  const { isConnected, subscribe, unsubscribe } = useWebSocket(true);

  // Local state for filters
  const [filter, setFilter] = useState<IProjectFilter>({
    status: undefined,
    priority: undefined,
    search: '',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  });

  // Track pending filter requests for cancellation
  const [pendingRequest, setPendingRequest] = useState<AbortController | null>(null);

  // Debounced filter handler
  const handleFilterChange = useCallback(
    debounce((newFilter: Partial<IProjectFilter>) => {
      // Cancel any pending requests
      if (pendingRequest) {
        pendingRequest.abort();
      }

      // Create new abort controller for this request
      const abortController = new AbortController();
      setPendingRequest(abortController);

      setFilter(prevFilter => ({
        ...prevFilter,
        ...newFilter,
        page: 1 // Reset pagination when filter changes
      }));

      // Update URL query parameters
      const searchParams = new URLSearchParams();
      Object.entries({ ...filter, ...newFilter }).forEach(([key, value]) => {
        if (value) searchParams.set(key, value.toString());
      });
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}?${searchParams.toString()}`
      );
    }, 300),
    []
  );

  // Handle real-time project updates
  const handleProjectUpdate = useCallback((updatedProject: IProject) => {
    dispatch(updateProject({
      id: updatedProject.id,
      updates: updatedProject
    }));
  }, [dispatch]);

  // Subscribe to WebSocket events
  useEffect(() => {
    subscribe('project:updated', handleProjectUpdate);
    subscribe('project:created', () => dispatch(fetchProjects(filter)));
    subscribe('project:deleted', () => dispatch(fetchProjects(filter)));

    return () => {
      unsubscribe('project:updated', handleProjectUpdate);
      unsubscribe('project:created', handleProjectUpdate);
      unsubscribe('project:deleted', handleProjectUpdate);
    };
  }, [subscribe, unsubscribe, handleProjectUpdate, dispatch, filter]);

  // Fetch projects when filter changes
  useEffect(() => {
    dispatch(fetchProjects(filter));
  }, [dispatch, filter]);

  // Memoized filter controls
  const FilterControls = useMemo(() => (
    <div className={styles.filterControls}>
      <input
        type="text"
        placeholder="Search projects..."
        value={filter.search}
        onChange={(e) => handleFilterChange({ search: e.target.value })}
        className={styles.searchInput}
        aria-label="Search projects"
      />

      <select
        value={filter.status || ''}
        onChange={(e) => handleFilterChange({ status: e.target.value as ProjectStatus })}
        className={styles.filterSelect}
        aria-label="Filter by status"
      >
        <option value="">All Statuses</option>
        {Object.values(ProjectStatus).map(status => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>

      <select
        value={filter.priority || ''}
        onChange={(e) => handleFilterChange({ priority: e.target.value as 'low' | 'medium' | 'high' })}
        className={styles.filterSelect}
        aria-label="Filter by priority"
      >
        <option value="">All Priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <select
        value={filter.sortBy}
        onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
        className={styles.filterSelect}
        aria-label="Sort by"
      >
        <option value="updatedAt">Last Updated</option>
        <option value="createdAt">Created Date</option>
        <option value="name">Name</option>
        <option value="priority">Priority</option>
      </select>
    </div>
  ), [filter, handleFilterChange]);

  return (
    <MainLayout>
      <div className={styles.projectsPage}>
        <header className={styles.header}>
          <h1>Projects</h1>
          {!isConnected && (
            <div className={styles.connectionWarning} role="alert">
              Offline Mode - Some features may be limited
            </div>
          )}
        </header>

        {FilterControls}

        <ProjectList
          initialFilter={filter}
          className={styles.projectList}
          isCompact={window.innerWidth < 768}
        />

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

// CSS Module
const styles = {
  projectsPage: `
    padding: var(--spacing-lg);
    max-width: var(--max-width-7xl);
    margin: 0 auto;
  `,
  header: `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
  `,
  filterControls: `
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;

    @media (max-width: var(--breakpoint-sm)) {
      flex-direction: column;
    }
  `,
  searchInput: `
    flex: 1;
    min-width: 200px;
    padding: var(--spacing-sm);
    border: var(--border-width-thin) solid var(--color-border);
    border-radius: var(--border-radius-md);
    font-size: var(--font-size-md);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-light);
    }
  `,
  filterSelect: `
    padding: var(--spacing-sm);
    border: var(--border-width-thin) solid var(--color-border);
    border-radius: var(--border-radius-md);
    background-color: var(--color-background);
    min-width: 150px;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-light);
    }
  `,
  projectList: `
    margin-top: var(--spacing-lg);
  `,
  connectionWarning: `
    background-color: var(--color-warning-light);
    color: var(--color-warning-dark);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius-md);
    font-size: var(--font-size-sm);
  `,
  error: `
    background-color: var(--color-error-light);
    color: var(--color-error);
    padding: var(--spacing-md);
    border-radius: var(--border-radius-md);
    margin-top: var(--spacing-md);
  `
} as const;

export default Projects;