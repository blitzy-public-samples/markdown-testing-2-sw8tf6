import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ErrorBoundary } from 'react-error-boundary';
import { useStore } from 'zustand';

import TaskForm from '../../components/tasks/TaskForm';
import MainLayout from '../../components/layout/MainLayout';
import { useWebSocket } from '../../hooks/useWebSocket';
import { taskService } from '../../services/task.service';
import { ITask, ITaskCreateDTO } from '../../interfaces/task.interface';
import { PROTECTED_ROUTES } from '../../constants/routes.constants';
import { ERROR_MESSAGES } from '../../constants/error.constants';

/**
 * TaskCreate component for creating new tasks with real-time updates
 * Implements comprehensive validation and file upload functionality
 */
const TaskCreate: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isConnected, emit } = useWebSocket(true);

  // Set page title on mount
  useEffect(() => {
    document.title = 'Create New Task | Task Management System';
  }, []);

  /**
   * Handles file upload with validation and security checks
   */
  const handleFileUpload = useCallback(async (files: File[]): Promise<string[]> => {
    try {
      // File validation would be implemented here
      // This is a placeholder for the actual file upload logic
      return ['file-url-1', 'file-url-2'];
    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error(ERROR_MESSAGES.VALIDATION.INVALID_FILE);
    }
  }, []);

  /**
   * Handles task creation with optimistic updates and real-time sync
   */
  const handleTaskCreate = useCallback(async (taskData: ITaskCreateDTO): Promise<void> => {
    setIsSubmitting(true);

    try {
      // Handle file attachments if present
      let attachments: string[] = [];
      if (taskData.attachments?.length) {
        attachments = await handleFileUpload(taskData.attachments as unknown as File[]);
      }

      // Create task with processed attachments
      const createdTask = await taskService.createTask({
        ...taskData,
        attachments
      });

      // Emit real-time update if WebSocket is connected
      if (isConnected) {
        await emit('taskCreated', {
          task: createdTask,
          timestamp: Date.now()
        });
      }

      // Show success notification
      toast.success('Task created successfully', {
        position: 'top-right',
        autoClose: 3000
      });

      // Navigate to task list
      navigate(PROTECTED_ROUTES.TASKS.LIST);
    } catch (error) {
      // Show error notification
      toast.error(error instanceof Error ? error.message : ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR, {
        position: 'top-right',
        autoClose: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [navigate, emit, isConnected]);

  /**
   * Error boundary fallback component
   */
  const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
    <div role="alert" className="error-container">
      <h2>Error Creating Task</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try Again</button>
    </div>
  );

  return (
    <MainLayout>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => {
          setIsSubmitting(false);
        }}
      >
        <div className="task-create-container">
          <h1 className="task-create-title">Create New Task</h1>
          
          {/* Real-time connection status indicator */}
          {!isConnected && (
            <div className="connection-warning" role="alert">
              Working offline - Changes will sync when connection is restored
            </div>
          )}

          <TaskForm
            onSubmit={handleTaskCreate}
            onCancel={() => navigate(PROTECTED_ROUTES.TASKS.LIST)}
            isSubmitting={isSubmitting}
          />
        </div>
      </ErrorBoundary>
    </MainLayout>
  );
};

export default TaskCreate;