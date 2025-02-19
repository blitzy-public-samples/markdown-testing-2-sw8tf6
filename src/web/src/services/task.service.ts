/**
 * Task Service
 * Version: 1.0.0
 * 
 * Service class that handles all task-related API operations including CRUD operations,
 * filtering, status updates, real-time synchronization, caching, and error handling.
 */

import { Socket, io } from 'socket.io-client'; // ^4.7.2
import retry from 'axios-retry'; // ^3.8.0
import { apiService } from './api.service';
import { ITask, ITaskCreateDTO, ITaskUpdateDTO, ITaskFilter, TaskStatus } from '../interfaces/task.interface';
import { API_ENDPOINTS } from '../constants/api.constants';
import { ERROR_MESSAGES } from '../constants/error.constants';

/**
 * Service class for managing task-related operations with real-time updates
 */
export class TaskService {
    private socket: Socket;
    private pendingRequests: Map<string, Promise<any>>;
    private rateLimitCounter: number;
    private readonly RATE_LIMIT = 100; // 100 requests per minute
    private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds

    constructor() {
        // Initialize WebSocket connection for real-time updates
        this.socket = io(process.env.VITE_WS_URL || 'ws://localhost:3000', {
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        this.pendingRequests = new Map();
        this.rateLimitCounter = 0;

        // Setup WebSocket event handlers
        this.setupWebSocketHandlers();

        // Configure retry logic for failed requests
        retry(apiService, {
            retries: 3,
            retryDelay: (retryCount) => {
                return Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
            },
            retryCondition: (error) => {
                return retry.isNetworkOrIdempotentRequestError(error) ||
                    error.response?.status === 429 ||
                    (error.response?.status >= 500 && error.response?.status <= 599);
            }
        });

        // Reset rate limit counter every minute
        setInterval(() => {
            this.rateLimitCounter = 0;
        }, this.RATE_LIMIT_WINDOW);
    }

    /**
     * Sets up WebSocket event handlers for real-time updates
     */
    private setupWebSocketHandlers(): void {
        this.socket.on('connect', () => {
            console.log('WebSocket connected for task updates');
        });

        this.socket.on('disconnect', () => {
            console.log('WebSocket disconnected from task updates');
        });

        this.socket.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    }

    /**
     * Checks and enforces rate limiting
     * @throws Error if rate limit is exceeded
     */
    private checkRateLimit(): void {
        if (this.rateLimitCounter >= this.RATE_LIMIT) {
            throw new Error(ERROR_MESSAGES.SYSTEM.RATE_LIMIT_EXCEEDED);
        }
        this.rateLimitCounter++;
    }

    /**
     * Retrieves tasks based on filter criteria with caching
     * @param filter - Task filter criteria
     * @returns Promise with tasks and total count
     */
    public async getTasks(filter: ITaskFilter): Promise<{ tasks: ITask[]; total: number }> {
        this.checkRateLimit();

        const requestKey = `getTasks-${JSON.stringify(filter)}`;
        if (this.pendingRequests.has(requestKey)) {
            return this.pendingRequests.get(requestKey)!;
        }

        const request = apiService.get<{ tasks: ITask[]; total: number }>(
            API_ENDPOINTS.TASKS.BASE,
            filter
        );

        this.pendingRequests.set(requestKey, request);
        try {
            const response = await request;
            this.pendingRequests.delete(requestKey);
            return response;
        } catch (error) {
            this.pendingRequests.delete(requestKey);
            throw error;
        }
    }

    /**
     * Retrieves a specific task by ID
     * @param id - Task ID
     * @returns Promise with task details
     */
    public async getTaskById(id: string): Promise<ITask> {
        this.checkRateLimit();

        const requestKey = `getTaskById-${id}`;
        if (this.pendingRequests.has(requestKey)) {
            return this.pendingRequests.get(requestKey)!;
        }

        const request = apiService.get<ITask>(
            API_ENDPOINTS.TASKS.BY_ID.replace(':id', id)
        );

        this.pendingRequests.set(requestKey, request);
        try {
            const response = await request;
            this.pendingRequests.delete(requestKey);
            return response;
        } catch (error) {
            this.pendingRequests.delete(requestKey);
            throw error;
        }
    }

    /**
     * Creates a new task with real-time update
     * @param task - Task creation data
     * @returns Promise with created task
     */
    public async createTask(task: ITaskCreateDTO): Promise<ITask> {
        this.checkRateLimit();

        try {
            const createdTask = await apiService.post<ITask>(
                API_ENDPOINTS.TASKS.BASE,
                task
            );

            // Emit real-time update
            this.socket.emit('taskCreated', createdTask);

            return createdTask;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Updates an existing task with real-time update
     * @param id - Task ID
     * @param task - Task update data
     * @returns Promise with updated task
     */
    public async updateTask(id: string, task: ITaskUpdateDTO): Promise<ITask> {
        this.checkRateLimit();

        try {
            const updatedTask = await apiService.put<ITask>(
                API_ENDPOINTS.TASKS.BY_ID.replace(':id', id),
                task
            );

            // Emit real-time update
            this.socket.emit('taskUpdated', updatedTask);

            return updatedTask;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Updates task status with real-time notification
     * @param id - Task ID
     * @param status - New task status
     * @returns Promise with updated task
     */
    public async updateTaskStatus(id: string, status: TaskStatus): Promise<ITask> {
        this.checkRateLimit();

        try {
            const updatedTask = await apiService.put<ITask>(
                API_ENDPOINTS.TASKS.STATUS.replace(':id', id),
                { status }
            );

            // Emit real-time update
            this.socket.emit('taskStatusUpdated', updatedTask);

            return updatedTask;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Deletes a task with real-time update
     * @param id - Task ID
     * @returns Promise void
     */
    public async deleteTask(id: string): Promise<void> {
        this.checkRateLimit();

        try {
            await apiService.delete(API_ENDPOINTS.TASKS.BY_ID.replace(':id', id));

            // Emit real-time update
            this.socket.emit('taskDeleted', { id });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Subscribes to real-time task updates for a specific project
     * @param projectId - Project ID to subscribe to
     */
    public subscribeToProjectTasks(projectId: string): void {
        this.socket.emit('subscribeToProject', { projectId });
    }

    /**
     * Unsubscribes from real-time task updates for a specific project
     * @param projectId - Project ID to unsubscribe from
     */
    public unsubscribeFromProjectTasks(projectId: string): void {
        this.socket.emit('unsubscribeFromProject', { projectId });
    }
}

// Export singleton instance
export const taskService = new TaskService();