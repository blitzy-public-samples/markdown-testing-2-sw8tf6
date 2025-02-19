import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import debounce from 'lodash/debounce';
import TaskForm from '../../components/tasks/TaskForm';
import { ITask, TaskValidationError } from '../../interfaces/task.interface';
import { taskService } from '../../services/task.service';
import { AppError, handleApiError } from '../../utils/error.util';
import { ERROR_MESSAGES } from '../../constants/error.constants';

/**
 * TaskEdit component for editing existing tasks with comprehensive validation,
 * real-time updates, and error handling.
 */
const TaskEdit: React.FC = () => {
  // Navigation and route params
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();

  // State management
  const [task, setTask] = useState<ITask>();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AppError | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Refs for cleanup and optimistic updates
  const previousTaskRef = useRef<ITask>();
  const abortControllerRef = useRef<AbortController>();

  // Fetch task data with error handling
  const fetchTask = useCallback(async () => {
    if (!taskId) {
      setError(new AppError(
        'VALIDATION_INVALID_REQUEST',
        ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD,
        'error',
        { field: 'taskId' }
      ));
      return;
    }

    try {
      setLoading(true);
      const fetchedTask = await taskService.getTaskById(taskId);
      setTask(fetchedTask);
      previousTaskRef.current = fetchedTask;
    } catch (error) {
      const appError = handleApiError(error as Error);
      setError(appError);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // Debounced task update with optimistic updates and error recovery
  const handleTaskUpdate = useCallback(
    debounce(async (updatedTask: ITask) => {
      if (!taskId || !updatedTask) return;

      try {
        setIsSaving(true);
        // Store previous state for rollback
        previousTaskRef.current = task;

        // Optimistic update
        setTask(updatedTask);

        // Actual API update
        const result = await taskService.updateTask(taskId, {
          title: updatedTask.title,
          description: updatedTask.description,
          assigneeId: updatedTask.assignee.id,
          priority: updatedTask.priority,
          dueDate: updatedTask.dueDate,
          status: updatedTask.status,
          attachments: updatedTask.attachments,
          tags: updatedTask.tags
        });

        // Update with server response
        setTask(result);
        navigate(`/tasks/${taskId}`);
      } catch (error) {
        // Rollback on error
        if (previousTaskRef.current) {
          setTask(previousTaskRef.current);
        }

        const appError = handleApiError(error as Error);
        setError(appError);
      } finally {
        setIsSaving(false);
      }
    }, 500),
    [taskId, task, navigate]
  );

  // Handle form cancellation
  const handleCancel = useCallback(() => {
    navigate(`/tasks/${taskId}`);
  }, [taskId, navigate]);

  // Setup WebSocket subscription for real-time updates
  useEffect(() => {
    if (taskId) {
      taskService.subscribeToProjectTasks(task?.project.id || '');
    }

    return () => {
      if (task?.project.id) {
        taskService.unsubscribeFromProjectTasks(task.project.id);
      }
    };
  }, [taskId, task?.project.id]);

  // Initial data fetch
  useEffect(() => {
    abortControllerRef.current = new AbortController();
    fetchTask();

    return () => {
      abortControllerRef.current?.abort();
      handleTaskUpdate.cancel();
    };
  }, [fetchTask]);

  // Loading state
  if (loading) {
    return (
      <div className="task-edit__loading" role="status" aria-busy="true">
        <span className="sr-only">Loading task...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div 
        className="task-edit__error" 
        role="alert" 
        aria-live="polite"
      >
        <h2>Error Loading Task</h2>
        <p>{error.message}</p>
        <button 
          onClick={fetchTask}
          className="task-edit__retry-button"
          aria-label="Retry loading task"
        >
          Retry
        </button>
      </div>
    );
  }

  // Main render
  return (
    <div className="task-edit">
      <header className="task-edit__header">
        <h1 className="task-edit__title">
          Edit Task: {task?.title}
        </h1>
      </header>

      <main className="task-edit__content">
        {task && (
          <TaskForm
            task={task}
            onSubmit={handleTaskUpdate}
            onCancel={handleCancel}
            className="task-edit__form"
          />
        )}
      </main>

      {isSaving && (
        <div 
          className="task-edit__saving-indicator"
          role="status"
          aria-live="polite"
        >
          <span className="sr-only">Saving changes...</span>
        </div>
      )}
    </div>
  );
};

export default TaskEdit;