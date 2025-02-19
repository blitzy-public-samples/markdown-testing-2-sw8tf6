/**
 * @fileoverview Core project service implementing comprehensive project management
 * with caching, error handling, and performance optimizations
 * @version 1.0.0
 */

import { injectable, inject } from 'inversify';
import { validate } from 'class-validator';
import { CircuitBreaker } from 'opossum';
import { Logger } from 'winston';
import { CacheService } from 'redis';
import { IProject, ProjectStatus } from '../interfaces/project.interface';
import { ProjectRepository } from '../repositories/project.repository';
import { NotificationService } from '../../notification-service/services/notification.service';
import { NotificationType, NotificationPriority } from '../../notification-service/interfaces/notification.interface';
import { BUSINESS_ERRORS, SYSTEM_ERRORS } from '../../common/constants/error-codes';

const CACHE_TTL = 3600; // 1 hour cache TTL
const CACHE_PREFIX = 'project:';
const MAX_RETRIES = 3;
const CIRCUIT_BREAKER_OPTIONS = {
    timeout: 3000, // 3 seconds
    errorThresholdPercentage: 50,
    resetTimeout: 30000 // 30 seconds
};

/**
 * Core service implementing project management business logic
 * with caching, error handling, and performance optimizations
 */
@injectable()
export class ProjectService {
    private readonly circuitBreaker: CircuitBreaker;

    constructor(
        @inject(ProjectRepository) private readonly projectRepository: ProjectRepository,
        @inject(NotificationService) private readonly notificationService: NotificationService,
        @inject(CacheService) private readonly cacheService: CacheService,
        @inject(Logger) private readonly logger: Logger
    ) {
        // Initialize circuit breaker for repository operations
        this.circuitBreaker = new CircuitBreaker(
            this.projectRepository.create.bind(this.projectRepository),
            CIRCUIT_BREAKER_OPTIONS
        );

        this.setupCircuitBreakerHandlers();
    }

    /**
     * Sets up circuit breaker event handlers
     */
    private setupCircuitBreakerHandlers(): void {
        this.circuitBreaker.on('open', () => {
            this.logger.warn('Circuit breaker opened', {
                code: SYSTEM_ERRORS.CIRCUIT_BREAKER_OPEN
            });
        });

        this.circuitBreaker.on('halfOpen', () => {
            this.logger.info('Circuit breaker half-open');
        });

        this.circuitBreaker.on('close', () => {
            this.logger.info('Circuit breaker closed');
        });
    }

    /**
     * Creates a new project with validation and notifications
     * @param projectData Project data to create
     * @returns Created project
     */
    public async createProject(projectData: Omit<IProject, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<IProject> {
        try {
            // Validate project data
            await validate(projectData);

            // Set initial status
            projectData.status = ProjectStatus.DRAFT;

            // Create project using circuit breaker
            const project = await this.circuitBreaker.fire(projectData);

            // Notify project owner and members
            await this.notifyProjectStakeholders(project, NotificationType.PROJECT_UPDATED, {
                action: 'created',
                projectId: project.id,
                projectName: project.name
            });

            // Invalidate relevant caches
            await this.invalidateProjectCache(project.id, project.ownerId);

            this.logger.info('Project created successfully', {
                projectId: project.id,
                ownerId: project.ownerId
            });

            return project;

        } catch (error) {
            this.logger.error('Failed to create project', error as Error, {
                data: projectData,
                code: BUSINESS_ERRORS.RESOURCE_EXISTS
            });
            throw error;
        }
    }

    /**
     * Retrieves a project by ID with caching
     * @param projectId Project ID to retrieve
     * @param userId User ID requesting access
     * @returns Project if found and accessible
     */
    public async getProjectById(projectId: string, userId: string): Promise<IProject> {
        try {
            // Check cache first
            const cachedProject = await this.getCachedProject(projectId);
            if (cachedProject) {
                await this.validateProjectAccess(cachedProject, userId);
                return cachedProject;
            }

            // Fetch from repository if not cached
            const project = await this.projectRepository.findById(projectId);
            if (!project) {
                throw new Error(BUSINESS_ERRORS.RESOURCE_NOT_FOUND);
            }

            // Validate user access
            await this.validateProjectAccess(project, userId);

            // Cache project data
            await this.cacheProject(project);

            return project;

        } catch (error) {
            this.logger.error('Failed to retrieve project', error as Error, {
                projectId,
                userId,
                code: BUSINESS_ERRORS.RESOURCE_NOT_FOUND
            });
            throw error;
        }
    }

    /**
     * Updates a project with validation and notifications
     * @param projectId Project ID to update
     * @param updateData Project data to update
     * @param userId User ID performing update
     * @returns Updated project
     */
    public async updateProject(
        projectId: string,
        updateData: Partial<IProject>,
        userId: string
    ): Promise<IProject> {
        try {
            // Get current project
            const currentProject = await this.getProjectById(projectId, userId);

            // Validate update data
            await validate(updateData);

            // Perform update
            const updatedProject = await this.projectRepository.update(projectId, {
                ...updateData,
                updatedBy: userId
            });

            // Notify stakeholders
            await this.notifyProjectStakeholders(updatedProject, NotificationType.PROJECT_UPDATED, {
                action: 'updated',
                projectId,
                projectName: updatedProject.name,
                changes: this.getProjectChanges(currentProject, updatedProject)
            });

            // Invalidate caches
            await this.invalidateProjectCache(projectId, updatedProject.ownerId);

            return updatedProject;

        } catch (error) {
            this.logger.error('Failed to update project', error as Error, {
                projectId,
                userId,
                code: BUSINESS_ERRORS.OPERATION_INVALID
            });
            throw error;
        }
    }

    /**
     * Deletes a project with validation and cleanup
     * @param projectId Project ID to delete
     * @param userId User ID performing deletion
     */
    public async deleteProject(projectId: string, userId: string): Promise<void> {
        try {
            // Get project and validate access
            const project = await this.getProjectById(projectId, userId);

            // Ensure project can be deleted
            if (project.status === ProjectStatus.ACTIVE) {
                throw new Error(BUSINESS_ERRORS.RESOURCE_LOCKED);
            }

            // Delete project
            await this.projectRepository.delete(projectId);

            // Notify stakeholders
            await this.notifyProjectStakeholders(project, NotificationType.PROJECT_UPDATED, {
                action: 'deleted',
                projectId,
                projectName: project.name
            });

            // Clear caches
            await this.invalidateProjectCache(projectId, project.ownerId);

        } catch (error) {
            this.logger.error('Failed to delete project', error as Error, {
                projectId,
                userId,
                code: BUSINESS_ERRORS.OPERATION_INVALID
            });
            throw error;
        }
    }

    /**
     * Validates user access to project
     * @param project Project to validate access for
     * @param userId User ID to validate
     */
    private async validateProjectAccess(project: IProject, userId: string): Promise<void> {
        const hasAccess = project.ownerId === userId || project.members.includes(userId);
        if (!hasAccess) {
            throw new Error(BUSINESS_ERRORS.RESOURCE_NOT_FOUND);
        }
    }

    /**
     * Retrieves project from cache
     * @param projectId Project ID to retrieve
     */
    private async getCachedProject(projectId: string): Promise<IProject | null> {
        const cached = await this.cacheService.get(`${CACHE_PREFIX}${projectId}`);
        return cached ? JSON.parse(cached) : null;
    }

    /**
     * Caches project data
     * @param project Project to cache
     */
    private async cacheProject(project: IProject): Promise<void> {
        await this.cacheService.setex(
            `${CACHE_PREFIX}${project.id}`,
            CACHE_TTL,
            JSON.stringify(project)
        );
    }

    /**
     * Invalidates project-related cache entries
     * @param projectId Project ID to invalidate
     * @param ownerId Owner ID to invalidate
     */
    private async invalidateProjectCache(projectId: string, ownerId: string): Promise<void> {
        await Promise.all([
            this.cacheService.del(`${CACHE_PREFIX}${projectId}`),
            this.cacheService.del(`${CACHE_PREFIX}owner:${ownerId}`)
        ]);
    }

    /**
     * Notifies project stakeholders of changes
     * @param project Project data
     * @param type Notification type
     * @param metadata Additional notification metadata
     */
    private async notifyProjectStakeholders(
        project: IProject,
        type: NotificationType,
        metadata: Record<string, any>
    ): Promise<void> {
        const stakeholders = [project.ownerId, ...project.members];
        
        const notifications = stakeholders.map(userId =>
            this.notificationService.createNotification({
                userId,
                type,
                title: `Project ${metadata.action}: ${project.name}`,
                message: `Project "${project.name}" has been ${metadata.action}`,
                priority: NotificationPriority.HIGH,
                metadata
            })
        );

        await Promise.all(notifications);
    }

    /**
     * Compares projects to determine changes
     * @param oldProject Original project state
     * @param newProject Updated project state
     */
    private getProjectChanges(oldProject: IProject, newProject: IProject): Record<string, any> {
        const changes: Record<string, any> = {};

        if (oldProject.name !== newProject.name) {
            changes.name = { from: oldProject.name, to: newProject.name };
        }
        if (oldProject.description !== newProject.description) {
            changes.description = { from: oldProject.description, to: newProject.description };
        }
        if (oldProject.status !== newProject.status) {
            changes.status = { from: oldProject.status, to: newProject.status };
        }

        return changes;
    }
}