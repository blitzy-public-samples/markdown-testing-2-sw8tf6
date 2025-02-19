/**
 * @fileoverview Enhanced task service implementing comprehensive task management functionality
 * @version 1.0.0
 */

import { injectable } from 'inversify'; // ^6.0.1
import { validate } from 'class-validator'; // ^0.14.0
import { Logger } from 'winston'; // ^3.8.0
import { TaskRepository } from '../repositories/task.repository';
import { 
    ITask, 
    ICreateTaskDTO, 
    IUpdateTaskDTO, 
    TaskStatus,
    TaskPriority,
    ITaskFilter 
} from '../interfaces/task.interface';
import { NotificationService } from '../../common/services/notification.service';
import { TaskCache } from '../../common/services/cache.service';
import { ValidationError } from '../../common/errors/validation.error';
import { UnauthorizedError } from '../../common/errors/unauthorized.error';
import { BusinessError } from '../../common/errors/business.error';

@injectable()
export class TaskService {
    private readonly CACHE_KEY_PREFIX = 'task:';
    private readonly MAX_TASKS_PER_PROJECT = 1000;
    private readonly STATUS_TRANSITION_RULES: Record<TaskStatus, TaskStatus[]> = {
        [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
        [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW, TaskStatus.BLOCKED, TaskStatus.TODO],
        [TaskStatus.IN_REVIEW]: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
        [TaskStatus.COMPLETED]: [TaskStatus.IN_PROGRESS],
        [TaskStatus.BLOCKED]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
    };

    constructor(
        private readonly taskRepository: TaskRepository,
        private readonly notificationService: NotificationService,
        private readonly logger: Logger,
        private readonly cache: TaskCache
    ) {}

    /**
     * Creates a new task with comprehensive validation and notifications
     * @param taskData Task creation data
     * @param userId ID of user creating the task
     * @param userRole Role of the user creating the task
     * @returns Created task
     */
    async createTask(
        taskData: ICreateTaskDTO,
        userId: string,
        userRole: string
    ): Promise<ITask> {
        try {
            // Validate user permissions
            if (!this.canCreateTask(userRole)) {
                throw new UnauthorizedError('User not authorized to create tasks');
            }

            // Validate task count per project
            const projectTaskCount = await this.taskRepository.findByFilter({
                projectId: taskData.projectId,
                page: 1,
                limit: 1
            });

            if (projectTaskCount[1] >= this.MAX_TASKS_PER_PROJECT) {
                throw new BusinessError(`Project has reached maximum task limit of ${this.MAX_TASKS_PER_PROJECT}`);
            }

            // Validate task data
            const validationErrors = await validate(taskData);
            if (validationErrors.length > 0) {
                throw new ValidationError('Invalid task data', validationErrors);
            }

            // Create task with audit trail
            const task = await this.taskRepository.createTask(taskData, userId);

            // Cache the new task
            await this.cache.set(
                `${this.CACHE_KEY_PREFIX}${task.id}`,
                task,
                3600 // 1 hour TTL
            );

            // Send notifications
            await this.notificationService.sendTaskAssignmentNotification({
                taskId: task.id,
                assigneeId: task.assigneeId,
                assignerId: userId,
                taskTitle: task.title
            });

            this.logger.info('Task created successfully', {
                taskId: task.id,
                userId,
                projectId: task.projectId
            });

            return task;
        } catch (error) {
            this.logger.error('Failed to create task', {
                error,
                userId,
                taskData
            });
            throw error;
        }
    }

    /**
     * Updates task status with transition validation and notifications
     * @param taskId Task ID
     * @param newStatus New status
     * @param userId User making the update
     * @param userRole User's role
     * @returns Updated task
     */
    async updateTaskStatus(
        taskId: string,
        newStatus: TaskStatus,
        userId: string,
        userRole: string
    ): Promise<ITask> {
        try {
            // Get current task state
            const task = await this.getTaskById(taskId);
            if (!task) {
                throw new BusinessError(`Task ${taskId} not found`);
            }

            // Validate user permissions
            if (!this.canUpdateTaskStatus(task, userId, userRole)) {
                throw new UnauthorizedError('User not authorized to update task status');
            }

            // Validate status transition
            if (!this.isValidStatusTransition(task.status, newStatus)) {
                throw new ValidationError(
                    `Invalid status transition from ${task.status} to ${newStatus}`
                );
            }

            // Update task status
            const updatedTask = await this.taskRepository.updateTask(
                taskId,
                { status: newStatus },
                userId
            );

            // Update cache
            await this.cache.set(
                `${this.CACHE_KEY_PREFIX}${taskId}`,
                updatedTask,
                3600
            );

            // Send notifications
            await this.notificationService.sendTaskStatusUpdateNotification({
                taskId,
                previousStatus: task.status,
                newStatus,
                updatedBy: userId
            });

            this.logger.info('Task status updated successfully', {
                taskId,
                previousStatus: task.status,
                newStatus,
                userId
            });

            return updatedTask;
        } catch (error) {
            this.logger.error('Failed to update task status', {
                error,
                taskId,
                newStatus,
                userId
            });
            throw error;
        }
    }

    /**
     * Retrieves a task by ID with caching
     * @param taskId Task ID
     * @returns Task or null if not found
     */
    async getTaskById(taskId: string): Promise<ITask | null> {
        try {
            // Check cache first
            const cachedTask = await this.cache.get<ITask>(
                `${this.CACHE_KEY_PREFIX}${taskId}`
            );
            if (cachedTask) {
                return cachedTask;
            }

            // Fetch from repository
            const task = await this.taskRepository.findById(taskId);
            if (task) {
                // Cache the result
                await this.cache.set(
                    `${this.CACHE_KEY_PREFIX}${taskId}`,
                    task,
                    3600
                );
            }

            return task;
        } catch (error) {
            this.logger.error('Failed to retrieve task', {
                error,
                taskId
            });
            throw error;
        }
    }

    /**
     * Checks if user can create tasks
     * @param userRole User role
     * @returns boolean
     */
    private canCreateTask(userRole: string): boolean {
        return ['ADMIN', 'MANAGER', 'TEAM_LEAD'].includes(userRole);
    }

    /**
     * Checks if user can update task status
     * @param task Task entity
     * @param userId User ID
     * @param userRole User role
     * @returns boolean
     */
    private canUpdateTaskStatus(
        task: ITask,
        userId: string,
        userRole: string
    ): boolean {
        return (
            ['ADMIN', 'MANAGER'].includes(userRole) ||
            (userRole === 'TEAM_LEAD' && task.projectId) ||
            task.assigneeId === userId
        );
    }

    /**
     * Validates status transition
     * @param currentStatus Current task status
     * @param newStatus New status
     * @returns boolean
     */
    private isValidStatusTransition(
        currentStatus: TaskStatus,
        newStatus: TaskStatus
    ): boolean {
        return this.STATUS_TRANSITION_RULES[currentStatus]?.includes(newStatus) ?? false;
    }
}