import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual'; // v3.0.0
import { useIntersectionObserver } from '@tanstack/react-intersection-observer'; // v3.0.0
import { useQueryClient } from '@tanstack/react-query'; // v4.0.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0
import { TaskCard, TaskCardProps } from './TaskCard';
import { ITask, ITaskFilter, TaskStatus, TaskPriority } from '../../interfaces/task.interface';
import styles from './TaskList.module.css';

// Props interface for the TaskList component
export interface TaskListProps {
  tasks: ITask[];
  filter: ITaskFilter;
  isLoading: boolean;
  error?: Error;
  onTaskClick?: (task: ITask) => void;
  onLoadMore?: () => void;
  hasMore: boolean;
  selectedTaskId?: string;
  className?: string;
  'aria-label'?: string;
}

// Custom hook for managing task list cache
const useTaskListCache = (filter: ITaskFilter) => {
  const queryClient = useQueryClient();
  
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries(['tasks', filter]);
  }, [queryClient, filter]);

  const updateTaskInCache = useCallback((updatedTask: ITask) => {
    queryClient.setQueryData(['tasks', filter], (oldData: { tasks: ITask[] } | undefined) => {
      if (!oldData) return { tasks: [updatedTask] };
      return {
        ...oldData,
        tasks: oldData.tasks.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        )
      };
    });
  }, [queryClient, filter]);

  return { invalidateCache, updateTaskInCache };
};

// Custom hook for infinite scroll functionality
const useInfiniteScroll = (onLoadMore: (() => void) | undefined, hasMore: boolean) => {
  const { ref, entry } = useIntersectionObserver({
    threshold: 0.5,
    rootMargin: '100px',
  });

  useEffect(() => {
    if (entry?.isIntersecting && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [entry?.isIntersecting, hasMore, onLoadMore]);

  return { loadMoreRef: ref };
};

// Error Fallback component
const TaskListErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className={styles.error} role="alert">
    <p>Error loading tasks: {error.message}</p>
    <button onClick={() => window.location.reload()} className={styles.retryButton}>
      Retry
    </button>
  </div>
);

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  filter,
  isLoading,
  error,
  onTaskClick,
  onLoadMore,
  hasMore,
  selectedTaskId,
  className,
  'aria-label': ariaLabel = 'Task list'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Set up virtualization
  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => containerRef.current,
    estimateSize: useCallback(() => 100, []), // Estimated row height
    overscan: 5,
  });

  // Set up infinite scroll
  const { loadMoreRef } = useInfiniteScroll(onLoadMore, hasMore);

  // Set up cache management
  const { updateTaskInCache } = useTaskListCache(filter);

  // Handle container resize
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent, taskIndex: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (taskIndex < tasks.length - 1) {
          const nextTask = tasks[taskIndex + 1];
          onTaskClick?.(nextTask);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (taskIndex > 0) {
          const prevTask = tasks[taskIndex - 1];
          onTaskClick?.(prevTask);
        }
        break;
    }
  }, [tasks, onTaskClick]);

  return (
    <ErrorBoundary FallbackComponent={TaskListErrorFallback}>
      <div
        ref={containerRef}
        className={`${styles.container} ${className || ''}`}
        role="list"
        aria-label={ariaLabel}
        aria-busy={isLoading}
      >
        {tasks.length === 0 && !isLoading ? (
          <div className={styles.empty} role="status">
            No tasks found
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const task = tasks[virtualRow.index];
              return (
                <div
                  key={task.id}
                  ref={virtualRow.index === tasks.length - 3 ? loadMoreRef : undefined}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <TaskCard
                    task={task}
                    onClick={onTaskClick}
                    isSelected={task.id === selectedTaskId}
                    className={styles.taskCard}
                    onKeyDown={(e) => handleKeyDown(e, virtualRow.index)}
                  />
                </div>
              );
            })}
          </div>
        )}
        
        {isLoading && (
          <div className={styles.loading} role="status">
            <span className={styles.loadingSpinner} />
            Loading tasks...
          </div>
        )}
        
        {error && (
          <div className={styles.error} role="alert">
            Error: {error.message}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

// CSS Module
const styles = {
  container: `
    height: 100%;
    overflow-y: auto;
    position: relative;
    scrollbar-width: thin;
    scrollbar-color: var(--color-gray-400) transparent;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
      background-color: var(--color-gray-400);
      border-radius: var(--border-radius-full);
    }
  `,
  taskCard: `
    margin: var(--spacing-xs);
    transition: transform var(--transition-fast);
    
    @media (max-width: var(--breakpoint-sm)) {
      margin: var(--spacing-xs) 0;
    }
  `,
  empty: `
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: var(--color-gray-500);
    font-size: var(--font-size-lg);
  `,
  loading: `
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-md);
    color: var(--color-gray-600);
    gap: var(--spacing-sm);
  `,
  loadingSpinner: `
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-gray-200);
    border-top-color: var(--color-primary);
    border-radius: var(--border-radius-full);
    animation: spin 1s linear infinite;
    
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
  error: `
    padding: var(--spacing-md);
    color: var(--color-red-600);
    background: var(--color-red-50);
    border-radius: var(--border-radius-md);
    margin: var(--spacing-md);
    text-align: center;
  `,
  retryButton: `
    margin-top: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-md);
    background: var(--color-red-600);
    color: white;
    border: none;
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    
    &:hover {
      background: var(--color-red-700);
    }
  `
} as const;

export default TaskList;