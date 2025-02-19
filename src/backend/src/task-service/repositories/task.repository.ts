/**
 * @fileoverview Enhanced task repository with optimized queries, transaction support, and audit logging
 * @version 1.0.0
 */

import { 
    EntityRepository, 
    Repository,
    QueryRunner,
    SelectQueryBuilder,
    In,
    LessThanOrEqual,
    MoreThanOrEqual,
    ILike
} from 'typeorm'; // ^0.3.0
import { AuditLogger } from '@internal/audit'; // ^1.0.0
import { Task } from '../models/task.model';
import { 
    ITask, 
    ITaskFilter, 
    ICreateTaskDTO, 
    IUpdateTaskDTO,
    TaskStatus 
} from '../interfaces/task.interface';
import { DatabaseError } from '../../common/errors/database.error';
import { CacheService } from '../../common/services/cache.service';

@EntityRepository(Task)
export class TaskRepository extends Repository<Task> {
    private readonly auditLogger: AuditLogger;
    private readonly cacheService: CacheService;
    private readonly CACHE_TTL = 3600; // 1 hour cache TTL

    constructor() {
        super();
        this.auditLogger = new AuditLogger('TaskRepository');
        this.cacheService = new CacheService();
    }

    /**
     * Creates a new task with validation and audit logging
     * @param createTaskDto Task creation data
     * @param userId ID of user creating the task
     * @param queryRunner Optional query runner for transaction support
     * @returns Created task entity
     */
    async createTask(
        createTaskDto: ICreateTaskDTO,
        userId: string,
        queryRunner?: QueryRunner
    ): Promise<Task> {
        try {
            const task = new Task({
                ...createTaskDto,
                createdBy: userId,
                updatedBy: userId
            });

            await task.validateBeforeSave();

            const repository = queryRunner?.manager.getRepository(Task) || this;
            const savedTask = await repository.save(task);

            await this.auditLogger.log({
                action: 'CREATE_TASK',
                entityId: savedTask.id,
                userId,
                details: { taskData: createTaskDto }
            });

            await this.cacheService.invalidate(`tasks:project:${task.projectId}`);
            return savedTask;
        } catch (error) {
            throw new DatabaseError('Failed to create task', error);
        }
    }

    /**
     * Retrieves a task by ID with optimized relation loading
     * @param id Task ID
     * @param relations Optional relations to load
     * @param useCache Whether to use cache
     * @returns Task entity or null
     */
    async findById(
        id: string,
        relations: string[] = [],
        useCache: boolean = true
    ): Promise<Task | null> {
        try {
            const cacheKey = `tasks:${id}`;
            
            if (useCache) {
                const cachedTask = await this.cacheService.get<Task>(cacheKey);
                if (cachedTask) return cachedTask;
            }

            const queryBuilder = this.createQueryBuilder('task')
                .where('task.id = :id', { id });

            if (relations.length > 0) {
                relations.forEach(relation => {
                    queryBuilder.leftJoinAndSelect(`task.${relation}`, relation);
                });
            }

            const task = await queryBuilder.getOne();

            if (task && useCache) {
                await this.cacheService.set(cacheKey, task, this.CACHE_TTL);
            }

            return task;
        } catch (error) {
            throw new DatabaseError('Failed to retrieve task', error);
        }
    }

    /**
     * Finds tasks based on filter criteria with pagination and performance optimization
     * @param filter Task filter criteria
     * @returns Tuple of tasks and total count
     */
    async findByFilter(filter: ITaskFilter): Promise<[Task[], number]> {
        try {
            const queryBuilder = this.createQueryBuilder('task');
            this.applyFilters(queryBuilder, filter);

            // Optimize query with selective loading
            if (filter.includeComments) {
                queryBuilder.leftJoinAndSelect('task.comments', 'comment');
            }

            // Apply pagination
            queryBuilder
                .skip((filter.page - 1) * filter.limit)
                .take(filter.limit);

            // Apply sorting
            queryBuilder.orderBy(
                `task.${filter.sortBy || 'createdAt'}`,
                filter.sortOrder || 'DESC'
            );

            const [tasks, total] = await queryBuilder.getManyAndCount();
            return [tasks, total];
        } catch (error) {
            throw new DatabaseError('Failed to retrieve tasks', error);
        }
    }

    /**
     * Updates a task with optimistic locking and audit logging
     * @param id Task ID
     * @param updateTaskDto Update data
     * @param userId ID of user updating the task
     * @param queryRunner Optional query runner for transaction support
     * @returns Updated task entity
     */
    async updateTask(
        id: string,
        updateTaskDto: IUpdateTaskDTO,
        userId: string,
        queryRunner?: QueryRunner
    ): Promise<Task> {
        try {
            const task = await this.findById(id);
            if (!task) {
                throw new Error(`Task with ID ${id} not found`);
            }

            const repository = queryRunner?.manager.getRepository(Task) || this;
            
            // Apply updates
            Object.assign(task, {
                ...updateTaskDto,
                updatedBy: userId
            });

            await task.validateBeforeSave();

            const updatedTask = await repository.save(task);

            await this.auditLogger.log({
                action: 'UPDATE_TASK',
                entityId: id,
                userId,
                details: { 
                    previous: task,
                    updated: updateTaskDto
                }
            });

            await this.cacheService.invalidate(`tasks:${id}`);
            await this.cacheService.invalidate(`tasks:project:${task.projectId}`);

            return updatedTask;
        } catch (error) {
            throw new DatabaseError('Failed to update task', error);
        }
    }

    /**
     * Soft deletes a task with audit logging
     * @param id Task ID
     * @param userId ID of user deleting the task
     * @param queryRunner Optional query runner for transaction support
     */
    async deleteTask(
        id: string,
        userId: string,
        queryRunner?: QueryRunner
    ): Promise<void> {
        try {
            const task = await this.findById(id);
            if (!task) {
                throw new Error(`Task with ID ${id} not found`);
            }

            const repository = queryRunner?.manager.getRepository(Task) || this;
            await repository.softDelete(id);

            await this.auditLogger.log({
                action: 'DELETE_TASK',
                entityId: id,
                userId,
                details: { taskData: task }
            });

            await this.cacheService.invalidate(`tasks:${id}`);
            await this.cacheService.invalidate(`tasks:project:${task.projectId}`);
        } catch (error) {
            throw new DatabaseError('Failed to delete task', error);
        }
    }

    /**
     * Applies filter criteria to query builder
     * @param queryBuilder Query builder instance
     * @param filter Filter criteria
     */
    private applyFilters(
        queryBuilder: SelectQueryBuilder<Task>,
        filter: ITaskFilter
    ): void {
        if (filter.title) {
            queryBuilder.andWhere('task.title ILIKE :title', { 
                title: `%${filter.title}%` 
            });
        }

        if (filter.projectId) {
            queryBuilder.andWhere('task.projectId = :projectId', { 
                projectId: filter.projectId 
            });
        }

        if (filter.assigneeId) {
            queryBuilder.andWhere('task.assigneeId = :assigneeId', { 
                assigneeId: filter.assigneeId 
            });
        }

        if (filter.status) {
            queryBuilder.andWhere('task.status = :status', { 
                status: filter.status 
            });
        }

        if (filter.priority) {
            queryBuilder.andWhere('task.priority = :priority', { 
                priority: filter.priority 
            });
        }

        if (filter.dueDate) {
            queryBuilder.andWhere('task.dueDate <= :dueDate', { 
                dueDate: filter.dueDate 
            });
        }

        if (filter.tags?.length) {
            queryBuilder.andWhere('task.tags && :tags', { 
                tags: filter.tags 
            });
        }
    }
}