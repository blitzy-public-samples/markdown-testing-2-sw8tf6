/**
 * @fileoverview Project repository implementation with caching and performance optimizations
 * @version 1.0.0
 */

import { injectable } from 'inversify'; // v6.0.1
import { PrismaClient } from '@prisma/client'; // v5.0.0
import Redis from 'ioredis'; // v5.3.0
import { IProject, IProjectFilter, ProjectStatus } from '../interfaces/project.interface';
import { Project } from '../models/project.model';

const CACHE_TTL = 3600; // 1 hour cache TTL
const MAX_PROJECTS_PER_ORG = 1000;
const CACHE_PREFIX = 'project:';

@injectable()
export class ProjectRepository {
    private readonly prisma: PrismaClient;
    private readonly redis: Redis;

    constructor(prisma: PrismaClient, redis: Redis) {
        this.prisma = prisma;
        this.redis = redis;
    }

    /**
     * Creates a new project with validation and transaction support
     * @param project Project data to create
     * @throws Error if organization project limit is exceeded
     */
    async create(project: IProject): Promise<Project> {
        // Validate project count for organization
        const projectCount = await this.prisma.project.count({
            where: { ownerId: project.ownerId }
        });

        if (projectCount >= MAX_PROJECTS_PER_ORG) {
            throw new Error(`Organization has reached maximum limit of ${MAX_PROJECTS_PER_ORG} projects`);
        }

        // Create project within transaction
        const result = await this.prisma.$transaction(async (tx) => {
            const newProject = new Project(project);
            newProject.validate();

            const created = await tx.project.create({
                data: {
                    ...newProject,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    version: 1
                }
            });

            // Invalidate relevant cache entries
            await this.redis.del(`${CACHE_PREFIX}owner:${project.ownerId}`);
            
            return created;
        });

        return result;
    }

    /**
     * Retrieves a project by ID with caching
     * @param id Project ID to find
     */
    async findById(id: string): Promise<Project | null> {
        // Check cache first
        const cached = await this.redis.get(`${CACHE_PREFIX}${id}`);
        if (cached) {
            return JSON.parse(cached) as Project;
        }

        // Query database if not cached
        const project = await this.prisma.project.findUnique({
            where: { id },
            include: {
                tasks: true // Include related tasks
            }
        });

        if (project) {
            // Cache the result
            await this.redis.setex(
                `${CACHE_PREFIX}${id}`,
                CACHE_TTL,
                JSON.stringify(project)
            );
        }

        return project;
    }

    /**
     * Retrieves projects with pagination and filtering
     * @param filter Filter and pagination criteria
     */
    async findAll(filter: IProjectFilter): Promise<{ data: Project[]; total: number }> {
        const { page = 1, pageSize = 10, name, ownerId, status } = filter;
        const skip = (page - 1) * pageSize;

        // Build where conditions
        const where = {
            ...(name && { name: { contains: name, mode: 'insensitive' } }),
            ...(ownerId && { ownerId }),
            ...(status && { status })
        };

        // Execute queries in parallel
        const [total, projects] = await Promise.all([
            this.prisma.project.count({ where }),
            this.prisma.project.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { updatedAt: 'desc' },
                include: {
                    tasks: true
                }
            })
        ]);

        // Cache results if first page
        if (page === 1 && ownerId) {
            await this.redis.setex(
                `${CACHE_PREFIX}owner:${ownerId}:page:1`,
                CACHE_TTL,
                JSON.stringify({ data: projects, total })
            );
        }

        return { data: projects, total };
    }

    /**
     * Updates a project with validation and cache management
     * @param id Project ID to update
     * @param project Updated project data
     */
    async update(id: string, project: Partial<IProject>): Promise<Project> {
        return await this.prisma.$transaction(async (tx) => {
            // Get current project for version check
            const current = await tx.project.findUnique({ where: { id } });
            if (!current) {
                throw new Error('Project not found');
            }

            // Validate update
            const updatedProject = new Project({ ...current, ...project });
            updatedProject.validate();
            updatedProject.incrementVersion();

            // Perform update
            const updated = await tx.project.update({
                where: { 
                    id,
                    version: current.version // Optimistic locking
                },
                data: {
                    ...updatedProject,
                    updatedAt: new Date()
                }
            });

            // Invalidate caches
            await Promise.all([
                this.redis.del(`${CACHE_PREFIX}${id}`),
                this.redis.del(`${CACHE_PREFIX}owner:${updated.ownerId}`)
            ]);

            return updated;
        });
    }

    /**
     * Deletes a project with cascade and cache cleanup
     * @param id Project ID to delete
     */
    async delete(id: string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            const project = await tx.project.findUnique({ where: { id } });
            if (!project) {
                throw new Error('Project not found');
            }

            // Delete related records first
            await tx.task.deleteMany({ where: { projectId: id } });
            
            // Delete the project
            await tx.project.delete({ where: { id } });

            // Clear caches
            await Promise.all([
                this.redis.del(`${CACHE_PREFIX}${id}`),
                this.redis.del(`${CACHE_PREFIX}owner:${project.ownerId}`)
            ]);
        });
    }
}