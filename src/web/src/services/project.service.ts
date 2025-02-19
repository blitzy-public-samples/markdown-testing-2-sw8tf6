/**
 * Project Service
 * Version: 1.0.0
 * 
 * Comprehensive service for managing project-related operations with:
 * - Advanced caching mechanisms
 * - Optimistic updates
 * - Error handling
 * - Request cancellation
 * - Performance optimizations
 */

import { apiService } from './api.service';
import {
    IProject,
    IProjectCreateDTO,
    IProjectUpdateDTO,
    IProjectFilter,
    ProjectStatus
} from '../interfaces/project.interface';
import { ERROR_MESSAGES } from '../constants/error.constants';
import { handleApiError } from '../utils/error.util';

/**
 * Cache configuration for project data
 */
interface ProjectCacheConfig {
    maxAge: number;
    cleanupInterval: number;
}

/**
 * Cache entry structure with timestamp for expiration
 */
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

export class ProjectService {
    private readonly baseUrl: string = '/api/projects';
    private readonly cache: Map<string, CacheEntry<IProject>> = new Map();
    private readonly listCache: Map<string, CacheEntry<{ data: IProject[]; total: number }>> = new Map();
    private abortController: AbortController | null = null;
    private readonly cacheConfig: ProjectCacheConfig = {
        maxAge: 5 * 60 * 1000, // 5 minutes
        cleanupInterval: 10 * 60 * 1000 // 10 minutes
    };

    constructor() {
        this.setupCacheCleanup();
    }

    /**
     * Sets up periodic cache cleanup to prevent memory leaks
     */
    private setupCacheCleanup(): void {
        setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this.cache.entries()) {
                if (now - entry.timestamp > this.cacheConfig.maxAge) {
                    this.cache.delete(key);
                }
            }
            for (const [key, entry] of this.listCache.entries()) {
                if (now - entry.timestamp > this.cacheConfig.maxAge) {
                    this.listCache.delete(key);
                }
            }
        }, this.cacheConfig.cleanupInterval);
    }

    /**
     * Retrieves a list of projects with caching and filtering
     */
    public async getProjects(filter: IProjectFilter): Promise<{ data: IProject[]; total: number }> {
        try {
            // Cancel any pending requests
            this.abortPendingRequests();

            // Generate cache key based on filter
            const cacheKey = this.generateListCacheKey(filter);
            const cachedData = this.listCache.get(cacheKey);

            if (cachedData && Date.now() - cachedData.timestamp < this.cacheConfig.maxAge) {
                return cachedData.data;
            }

            this.abortController = new AbortController();
            const response = await apiService.get<{ data: IProject[]; total: number }>(
                `${this.baseUrl}`,
                {
                    params: this.transformFilter(filter),
                    signal: this.abortController.signal
                }
            );

            // Cache the response
            this.listCache.set(cacheKey, {
                data: response,
                timestamp: Date.now()
            });

            return response;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(ERROR_MESSAGES.SYSTEM.REQUEST_CANCELLED);
            }
            throw handleApiError(error);
        }
    }

    /**
     * Retrieves a specific project by ID with caching
     */
    public async getProjectById(id: string): Promise<IProject> {
        try {
            const cachedProject = this.cache.get(id);
            if (cachedProject && Date.now() - cachedProject.timestamp < this.cacheConfig.maxAge) {
                return cachedProject.data;
            }

            const project = await apiService.get<IProject>(`${this.baseUrl}/${id}`);
            this.cache.set(id, { data: project, timestamp: Date.now() });
            return project;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    /**
     * Creates a new project with optimistic updates
     */
    public async createProject(projectData: IProjectCreateDTO): Promise<IProject> {
        try {
            const optimisticId = `temp-${Date.now()}`;
            const optimisticProject: IProject = {
                id: optimisticId,
                ...projectData,
                status: ProjectStatus.DRAFT,
                progress: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                members: [],
                owner: null as any // Will be set by backend
            };

            // Optimistic update
            this.cache.set(optimisticId, {
                data: optimisticProject,
                timestamp: Date.now()
            });

            const createdProject = await apiService.post<IProject>(this.baseUrl, projectData);
            
            // Update cache with actual data
            this.cache.delete(optimisticId);
            this.cache.set(createdProject.id, {
                data: createdProject,
                timestamp: Date.now()
            });

            return createdProject;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    /**
     * Updates a project with optimistic updates and cache management
     */
    public async updateProject(id: string, projectData: IProjectUpdateDTO): Promise<IProject> {
        try {
            const currentProject = await this.getProjectById(id);
            const optimisticProject: IProject = {
                ...currentProject,
                ...projectData,
                updatedAt: new Date()
            };

            // Optimistic update
            this.cache.set(id, {
                data: optimisticProject,
                timestamp: Date.now()
            });

            const updatedProject = await apiService.put<IProject>(`${this.baseUrl}/${id}`, projectData);
            
            // Update cache with actual data
            this.cache.set(id, {
                data: updatedProject,
                timestamp: Date.now()
            });

            return updatedProject;
        } catch (error) {
            // Revert optimistic update on error
            this.cache.delete(id);
            throw handleApiError(error);
        }
    }

    /**
     * Deletes a project and cleans up cache
     */
    public async deleteProject(id: string): Promise<void> {
        try {
            await apiService.delete(`${this.baseUrl}/${id}`);
            this.cache.delete(id);
            this.clearListCache();
        } catch (error) {
            throw handleApiError(error);
        }
    }

    /**
     * Transforms filter object into API-compatible query parameters
     */
    private transformFilter(filter: IProjectFilter): Record<string, any> {
        return {
            page: filter.page,
            limit: filter.limit,
            sortBy: filter.sortBy,
            sortOrder: filter.sortOrder,
            name: filter.name,
            owner: filter.owner,
            status: filter.status,
            priority: filter.priority,
            startDate: filter.startDate?.toISOString(),
            endDate: filter.endDate?.toISOString(),
            tags: filter.tags?.join(','),
            member: filter.member,
            progressMin: filter.progressMin,
            progressMax: filter.progressMax
        };
    }

    /**
     * Generates a cache key for list requests based on filter parameters
     */
    private generateListCacheKey(filter: IProjectFilter): string {
        return `list-${JSON.stringify(filter)}`;
    }

    /**
     * Aborts any pending requests
     */
    private abortPendingRequests(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    /**
     * Clears the list cache when data is modified
     */
    private clearListCache(): void {
        this.listCache.clear();
    }
}

// Export singleton instance
export const projectService = new ProjectService();