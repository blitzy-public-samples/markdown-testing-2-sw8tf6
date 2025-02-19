import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useInfiniteQuery } from 'react-query';
import debounce from 'lodash/debounce';
import { ErrorBoundary } from 'react-error-boundary';
import { TaskList, TaskListProps } from '../../components/tasks/TaskList';
import { TaskForm } from '../../components/tasks/TaskForm';
import { useWebSocket } from '../../hooks/useWebSocket';
import { taskService } from '../../services/task.service';
import { ITask, ITaskFilter, TaskStatus, TaskPriority } from '../../interfaces/task.interface';
import { AppError } from '../../utils/error.util';
import styles from './Tasks.module.css';

// Default filter values
const DEFAULT_FILTER: ITaskFilter = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

// Error fallback component
const TasksErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className={styles.error} role="alert">
    <h2>Error Loading Tasks</h2>
    <p>{error.message}</p>
    <button 
      onClick={() => window.location.reload()} 
      className={styles.retryButton}
    >
      Retry
    </button>
  </div>
);

export const Tasks: React.FC = () => {
  // State management
  const [filter, setFilter] = useState<ITaskFilter>(DEFAULT_FILTER);
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<ITask[]>([]);

  // WebSocket setup for real-time updates
  const {
    isConnected,
    subscribe,
    unsubscribe,
    connectionState
  } = useWebSocket(true);

  // Task query with infinite loading
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfiniteQuery(
    ['tasks', filter],
    async ({ pageParam = 1 }) => {
      const response = await taskService.getTasks({
        ...filter,
        page: pageParam
      });
      return response;
    },
    {
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.tasks.length < filter.limit) return undefined;
        return pages.length + 1;
      },
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
    }
  );

  // Memoized tasks array
  const tasks = useMemo(() => 
    data?.pages.flatMap(page => page.tasks) || [],
    [data]
  );

  // Debounced filter update
  const debouncedFilterUpdate = useMemo(
    () => debounce((newFilter: Partial<ITaskFilter>) => {
      setFilter(prev => ({ ...prev, ...newFilter, page: 1 }));
    }, 300),
    []
  );

  // Handle task selection
  const handleTaskSelect = useCallback(async (task: ITask) => {
    try {
      setSelectedTask(task);
      setIsFormOpen(true);
    } catch (error) {
      console.error('Error selecting task:', error);
    }
  }, []);

  // Handle task form submission
  const handleTaskSubmit = useCallback(async (task: ITask) => {
    try {
      if (!isConnected) {
        setOfflineQueue(prev => [...prev, task]);
        return;
      }

      if (selectedTask) {
        await taskService.updateTask(selectedTask.id, task);
      } else {
        await taskService.createTask(task);
      }

      setIsFormOpen(false);
      setSelectedTask(null);
      refetch();
    } catch (error) {
      throw new AppError(
        'TASK_SUBMISSION_FAILED',
        'Failed to save task',
        'error',
        { originalError: error }
      );
    }
  }, [isConnected, selectedTask, refetch]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'TASK_UPDATED':
      case 'TASK_CREATED':
      case 'TASK_DELETED':
        refetch();
        break;
    }
  }, [refetch]);

  // Subscribe to WebSocket events
  useEffect(() => {
    subscribe('task:updated', handleWebSocketMessage);
    subscribe('task:created', handleWebSocketMessage);
    subscribe('task:deleted', handleWebSocketMessage);

    return () => {
      unsubscribe('task:updated', handleWebSocketMessage);
      unsubscribe('task:created', handleWebSocketMessage);
      unsubscribe('task:deleted', handleWebSocketMessage);
    };
  }, [subscribe, unsubscribe, handleWebSocketMessage]);

  // Process offline queue when connection is restored
  useEffect(() => {
    if (isConnected && offlineQueue.length > 0) {
      Promise.all(
        offlineQueue.map(task => 
          task.id ? 
            taskService.updateTask(task.id, task) : 
            taskService.createTask(task)
        )
      )
        .then(() => {
          setOfflineQueue([]);
          refetch();
        })
        .catch(console.error);
    }
  }, [isConnected, offlineQueue, refetch]);

  return (
    <ErrorBoundary FallbackComponent={TasksErrorFallback}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Tasks</h1>
          <button
            onClick={() => setIsFormOpen(true)}
            className={styles.createButton}
            disabled={!isConnected}
          >
            Create Task
          </button>
        </header>

        <div className={styles.content}>
          <TaskList
            tasks={tasks}
            isLoading={isLoading}
            error={error instanceof Error ? error : undefined}
            onTaskClick={handleTaskSelect}
            onLoadMore={fetchNextPage}
            hasMore={!!hasNextPage}
            selectedTaskId={selectedTask?.id}
            className={styles.taskList}
          />
        </div>

        {isFormOpen && (
          <TaskForm
            task={selectedTask}
            onSubmit={handleTaskSubmit}
            onCancel={() => {
              setIsFormOpen(false);
              setSelectedTask(null);
            }}
            className={styles.taskForm}
          />
        )}

        {!isConnected && (
          <div className={styles.offlineBanner} role="alert">
            Working offline. Changes will sync when connection is restored.
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Tasks;