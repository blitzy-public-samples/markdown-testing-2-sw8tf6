import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // ^6.0.0
import { useErrorBoundary } from 'react-error-boundary'; // ^4.0.0
import { usePermissions } from '@auth/permissions'; // ^1.0.0
import { ITask, TaskStatus, TaskPriority } from '../../interfaces/task.interface';
import { taskService } from '../../services/task.service';
import { createError, handleApiError } from '../../utils/error.util';
import styles from './TaskDetails.module.css';

/**
 * TaskDetails component for displaying and managing task information
 * Implements real-time updates and RBAC-based access control
 */
const TaskDetails: React.FC = () => {
    // Route and navigation
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();
    const { showBoundary } = useErrorBoundary();

    // State management
    const [task, setTask] = useState<ITask | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // RBAC permissions
    const { hasPermission } = usePermissions();
    const canEdit = useMemo(() => hasPermission('task:edit'), [hasPermission]);
    const canDelete = useMemo(() => hasPermission('task:delete'), [hasPermission]);

    /**
     * Fetches task details and sets up real-time updates
     */
    useEffect(() => {
        let isSubscribed = true;

        const fetchTaskDetails = async () => {
            if (!taskId) {
                showBoundary(createError('VALIDATION_INVALID_REFERENCE'));
                return;
            }

            try {
                setIsLoading(true);
                const taskData = await taskService.getTaskById(taskId);
                
                if (isSubscribed) {
                    setTask(taskData);
                }
            } catch (error) {
                showBoundary(handleApiError(error));
            } finally {
                if (isSubscribed) {
                    setIsLoading(false);
                }
            }
        };

        fetchTaskDetails();

        // Set up real-time updates
        const handleTaskUpdate = (updatedTask: ITask) => {
            if (updatedTask.id === taskId && isSubscribed) {
                setTask(updatedTask);
            }
        };

        taskService.subscribeToTaskUpdates(taskId);

        return () => {
            isSubscribed = false;
            taskService.unsubscribeFromTaskUpdates(taskId);
        };
    }, [taskId, showBoundary]);

    /**
     * Handles task status updates with permission check
     */
    const handleStatusUpdate = useCallback(async (newStatus: TaskStatus) => {
        if (!canEdit || !task) return;

        try {
            setIsSaving(true);
            const updatedTask = await taskService.updateTask(task.id, {
                status: newStatus
            });
            setTask(updatedTask);
        } catch (error) {
            showBoundary(handleApiError(error));
        } finally {
            setIsSaving(false);
        }
    }, [task, canEdit, showBoundary]);

    /**
     * Handles task deletion with confirmation
     */
    const handleDeleteTask = useCallback(async () => {
        if (!canDelete || !task) return;

        const confirmed = window.confirm('Are you sure you want to delete this task?');
        if (!confirmed) return;

        try {
            await taskService.deleteTask(task.id);
            navigate('/tasks');
        } catch (error) {
            showBoundary(handleApiError(error));
        }
    }, [task, canDelete, navigate, showBoundary]);

    /**
     * Handles task updates with validation
     */
    const handleTaskUpdate = useCallback(async (updateData: Partial<ITask>) => {
        if (!canEdit || !task) return;

        try {
            setIsSaving(true);
            const updatedTask = await taskService.updateTask(task.id, updateData);
            setTask(updatedTask);
            setEditMode(false);
        } catch (error) {
            showBoundary(handleApiError(error));
        } finally {
            setIsSaving(false);
        }
    }, [task, canEdit, showBoundary]);

    if (isLoading) {
        return <div className={styles.loading}>Loading task details...</div>;
    }

    if (!task) {
        return <div className={styles.error}>Task not found</div>;
    }

    return (
        <div className={styles.taskDetails}>
            <header className={styles.header}>
                <h1 className={styles.title}>
                    {editMode ? (
                        <input
                            type="text"
                            value={task.title}
                            onChange={(e) => handleTaskUpdate({ title: e.target.value })}
                            disabled={!canEdit || isSaving}
                        />
                    ) : (
                        task.title
                    )}
                </h1>
                <div className={styles.actions}>
                    {canEdit && (
                        <button
                            className={styles.editButton}
                            onClick={() => setEditMode(!editMode)}
                            disabled={isSaving}
                        >
                            {editMode ? 'Cancel' : 'Edit'}
                        </button>
                    )}
                    {canDelete && (
                        <button
                            className={styles.deleteButton}
                            onClick={handleDeleteTask}
                            disabled={isSaving}
                        >
                            Delete
                        </button>
                    )}
                </div>
            </header>

            <div className={styles.content}>
                <section className={styles.mainInfo}>
                    <div className={styles.status}>
                        <label>Status:</label>
                        {canEdit ? (
                            <select
                                value={task.status}
                                onChange={(e) => handleStatusUpdate(e.target.value as TaskStatus)}
                                disabled={isSaving}
                            >
                                {Object.values(TaskStatus).map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <span className={styles[`status-${task.status.toLowerCase()}`]}>
                                {task.status}
                            </span>
                        )}
                    </div>

                    <div className={styles.priority}>
                        <label>Priority:</label>
                        {canEdit ? (
                            <select
                                value={task.priority}
                                onChange={(e) => handleTaskUpdate({ priority: e.target.value as TaskPriority })}
                                disabled={isSaving}
                            >
                                {Object.values(TaskPriority).map((priority) => (
                                    <option key={priority} value={priority}>
                                        {priority}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <span className={styles[`priority-${task.priority.toLowerCase()}`]}>
                                {task.priority}
                            </span>
                        )}
                    </div>
                </section>

                <section className={styles.description}>
                    <label>Description:</label>
                    {editMode ? (
                        <textarea
                            value={task.description}
                            onChange={(e) => handleTaskUpdate({ description: e.target.value })}
                            disabled={!canEdit || isSaving}
                        />
                    ) : (
                        <p>{task.description}</p>
                    )}
                </section>

                <section className={styles.assignee}>
                    <label>Assignee:</label>
                    <div className={styles.userInfo}>
                        <img
                            src={task.assignee.avatar || '/default-avatar.png'}
                            alt={task.assignee.name}
                            className={styles.avatar}
                        />
                        <span>{task.assignee.name}</span>
                    </div>
                </section>

                <section className={styles.attachments}>
                    <label>Attachments:</label>
                    <ul>
                        {task.attachments.map((attachment, index) => (
                            <li key={index} className={styles.attachment}>
                                <a href={attachment} target="_blank" rel="noopener noreferrer">
                                    Attachment {index + 1}
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    );
};

export default TaskDetails;