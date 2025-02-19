/**
 * @fileoverview Project controller implementing comprehensive REST API endpoints
 * with validation, authorization, real-time updates, and performance optimization
 * @version 1.0.0
 */

import { injectable } from 'inversify';
import { 
    controller, 
    httpGet, 
    httpPost, 
    httpPut, 
    httpDelete,
    request,
    response 
} from 'inversify-express-utils';
import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../common/decorators/validate.decorator';
import { ProjectService } from '../services/project.service';
import { IProject, ProjectStatus } from '../interfaces/project.interface';
import { BUSINESS_ERRORS, SYSTEM_ERRORS } from '../../common/constants/error-codes';
import { SUCCESS_CODES, CLIENT_ERROR_CODES } from '../../common/constants/status-codes';

// Rate limiting configuration
const projectRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Max 100 requests per minute
    message: { 
        status: CLIENT_ERROR_CODES.TOO_MANY_REQUESTS,
        code: SYSTEM_ERRORS.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests, please try again later'
    }
});

/**
 * Project controller implementing REST API endpoints with comprehensive features
 * Includes validation, authorization, caching, and performance optimization
 */
@injectable()
@controller('/api/projects')
@rateLimit(projectRateLimit)
export class ProjectController {
    constructor(private readonly projectService: ProjectService) {}

    /**
     * Creates a new project with validation and real-time updates
     * @param req Express request
     * @param res Express response
     */
    @httpPost('/')
    @validate(projectValidator)
    public async createProject(req: Request, res: Response): Promise<Response> {
        try {
            const projectData: Omit<IProject, 'id' | 'createdAt' | 'updatedAt' | 'version'> = {
                name: req.body.name,
                description: req.body.description,
                ownerId: req.user.id,
                status: ProjectStatus.DRAFT,
                startDate: new Date(req.body.startDate),
                endDate: new Date(req.body.endDate),
                members: req.body.members || [],
                metadata: req.body.metadata || {}
            };

            const project = await this.projectService.createProject(projectData);

            // Set cache control headers
            res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
            res.set('Expires', '-1');
            res.set('Pragma', 'no-cache');

            return res.status(SUCCESS_CODES.CREATED).json(project);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Retrieves a project by ID with caching
     * @param req Express request
     * @param res Express response
     */
    @httpGet('/:id')
    public async getProject(req: Request, res: Response): Promise<Response> {
        try {
            const project = await this.projectService.getProjectById(
                req.params.id,
                req.user.id
            );

            // Set cache control headers for GET requests
            res.set('Cache-Control', 'private, max-age=300'); // 5 minutes
            res.set('ETag', `"${project.version}"`);

            // Check if client has latest version
            const ifNoneMatch = req.get('If-None-Match');
            if (ifNoneMatch === `"${project.version}"`) {
                return res.status(SUCCESS_CODES.NOT_MODIFIED).send();
            }

            return res.status(SUCCESS_CODES.OK).json(project);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Retrieves paginated projects with filtering
     * @param req Express request
     * @param res Express response
     */
    @httpGet('/')
    public async getProjects(req: Request, res: Response): Promise<Response> {
        try {
            const { page = 1, limit = 10, status, name } = req.query;

            const projects = await this.projectService.getProjects({
                page: Number(page),
                limit: Number(limit),
                status: status as ProjectStatus,
                name: name as string,
                ownerId: req.user.id
            });

            // Set cache control headers
            res.set('Cache-Control', 'private, max-age=60'); // 1 minute
            res.set('ETag', `"${Date.now()}"`);

            return res.status(SUCCESS_CODES.OK).json(projects);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Updates a project with validation and notifications
     * @param req Express request
     * @param res Express response
     */
    @httpPut('/:id')
    @validate(projectValidator)
    public async updateProject(req: Request, res: Response): Promise<Response> {
        try {
            const projectId = req.params.id;
            const updateData: Partial<IProject> = {
                name: req.body.name,
                description: req.body.description,
                status: req.body.status,
                startDate: req.body.startDate && new Date(req.body.startDate),
                endDate: req.body.endDate && new Date(req.body.endDate),
                members: req.body.members,
                metadata: req.body.metadata
            };

            const project = await this.projectService.updateProject(
                projectId,
                updateData,
                req.user.id
            );

            // Invalidate cache
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

            return res.status(SUCCESS_CODES.OK).json(project);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Deletes a project with cleanup and notifications
     * @param req Express request
     * @param res Express response
     */
    @httpDelete('/:id')
    public async deleteProject(req: Request, res: Response): Promise<Response> {
        try {
            await this.projectService.deleteProject(
                req.params.id,
                req.user.id
            );

            // Invalidate cache
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

            return res.status(SUCCESS_CODES.NO_CONTENT).send();
        } catch (error) {
            throw error;
        }
    }

    /**
     * Adds a member to a project with validation
     * @param req Express request
     * @param res Express response
     */
    @httpPost('/:id/members')
    @validate(memberValidator)
    public async addProjectMember(req: Request, res: Response): Promise<Response> {
        try {
            const project = await this.projectService.addProjectMember(
                req.params.id,
                req.body.userId,
                req.user.id
            );

            // Invalidate cache
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

            return res.status(SUCCESS_CODES.OK).json(project);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Removes a member from a project with validation
     * @param req Express request
     * @param res Express response
     */
    @httpDelete('/:id/members/:userId')
    public async removeProjectMember(req: Request, res: Response): Promise<Response> {
        try {
            const project = await this.projectService.removeProjectMember(
                req.params.id,
                req.params.userId,
                req.user.id
            );

            // Invalidate cache
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

            return res.status(SUCCESS_CODES.OK).json(project);
        } catch (error) {
            throw error;
        }
    }
}