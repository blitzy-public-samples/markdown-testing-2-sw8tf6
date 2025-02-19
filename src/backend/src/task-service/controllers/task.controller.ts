/**
 * @fileoverview Task controller implementing REST API endpoints with caching, validation and real-time updates
 * @version 1.0.0
 */

import {
    Controller,
    Post,
    Get,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseInterceptors,
    CacheInterceptor,
    Headers,
    HttpStatus,
    HttpException,
    ParseUUIDPipe,
    ValidationPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { RateLimit } from '@nestjs/throttler';
import { Cache } from '@nestjs/cache-manager';

import { TaskService } from '../services/task.service';
import { 
    ITask, 
    ICreateTaskDTO, 
    IUpdateTaskDTO, 
    ITaskFilter,
    TaskStatus,
    TaskPriority 
} from '../interfaces/task.interface';

@Controller('tasks')
@ApiTags('Tasks')
@UseInterceptors(CacheInterceptor)
@RateLimit({ limit: 100, ttl: 60 })
export class TaskController {
    constructor(
        private readonly taskService: TaskService,
        private readonly cache: Cache
    ) {}

    /**
     * Creates a new task with validation and real-time notification
     */
    @Post()
    @ApiOperation({ summary: 'Create new task' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Task created successfully' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
    @ApiBody({ type: 'ICreateTaskDTO' })
    async createTask(
        @Body(new ValidationPipe({ transform: true })) createTaskDto: ICreateTaskDTO,
        @Headers('user-id') userId: string,
        @Headers('user-role') userRole: string
    ): Promise<ITask> {
        try {
            const task = await this.taskService.createTask(createTaskDto, userId, userRole);
            await this.cache.del(`tasks:project:${task.projectId}`);
            return task;
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to create task',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Updates an existing task with validation and cache invalidation
     */
    @Put(':id')
    @ApiOperation({ summary: 'Update task' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Task updated successfully' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Task not found' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    async updateTask(
        @Param('id', new ParseUUIDPipe()) taskId: string,
        @Body(new ValidationPipe({ transform: true })) updateTaskDto: IUpdateTaskDTO,
        @Headers('user-id') userId: string,
        @Headers('user-role') userRole: string
    ): Promise<ITask> {
        try {
            const task = await this.taskService.updateTask(taskId, updateTaskDto, userId, userRole);
            await this.cache.del(`tasks:${taskId}`);
            await this.cache.del(`tasks:project:${task.projectId}`);
            return task;
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to update task',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Updates task status with transition validation
     */
    @Put(':id/status')
    @ApiOperation({ summary: 'Update task status' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Status updated successfully' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid status transition' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    async updateTaskStatus(
        @Param('id', new ParseUUIDPipe()) taskId: string,
        @Body('status') status: TaskStatus,
        @Headers('user-id') userId: string,
        @Headers('user-role') userRole: string
    ): Promise<ITask> {
        try {
            const task = await this.taskService.updateTaskStatus(taskId, status, userId, userRole);
            await this.cache.del(`tasks:${taskId}`);
            return task;
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to update task status',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Retrieves a task by ID with caching
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get task by ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Task retrieved successfully' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Task not found' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    async getTaskById(
        @Param('id', new ParseUUIDPipe()) taskId: string
    ): Promise<ITask> {
        try {
            const task = await this.taskService.getTaskById(taskId);
            if (!task) {
                throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
            }
            return task;
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to retrieve task',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Retrieves tasks based on filter criteria with pagination
     */
    @Get()
    @ApiOperation({ summary: 'Get tasks with filtering' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Tasks retrieved successfully' })
    async getTasks(
        @Query(new ValidationPipe({ transform: true })) filter: ITaskFilter
    ): Promise<{ tasks: ITask[]; total: number }> {
        try {
            const [tasks, total] = await this.taskService.getTasks(filter);
            return { tasks, total };
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to retrieve tasks',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Deletes a task with proper authorization
     */
    @Delete(':id')
    @ApiOperation({ summary: 'Delete task' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Task deleted successfully' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Task not found' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    async deleteTask(
        @Param('id', new ParseUUIDPipe()) taskId: string,
        @Headers('user-id') userId: string,
        @Headers('user-role') userRole: string
    ): Promise<void> {
        try {
            const task = await this.taskService.getTaskById(taskId);
            if (!task) {
                throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
            }
            
            await this.taskService.deleteTask(taskId, userId, userRole);
            await this.cache.del(`tasks:${taskId}`);
            await this.cache.del(`tasks:project:${task.projectId}`);
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to delete task',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Retrieves tasks by project ID with caching
     */
    @Get('project/:projectId')
    @ApiOperation({ summary: 'Get tasks by project ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Tasks retrieved successfully' })
    @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
    async getTasksByProject(
        @Param('projectId', new ParseUUIDPipe()) projectId: string,
        @Query(new ValidationPipe({ transform: true })) filter: ITaskFilter
    ): Promise<{ tasks: ITask[]; total: number }> {
        try {
            const [tasks, total] = await this.taskService.getTasksByProject(projectId, filter);
            return { tasks, total };
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to retrieve project tasks',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}