import { Container } from 'inversify';
import { ProjectService } from '../services/project.service';
import { ProjectRepository } from '../repositories/project.repository';
import { NotificationService } from '../../notification-service/services/notification.service';
import { CacheService } from 'redis';
import { Logger } from '../../common/utils/logger.util';
import { IProject, ProjectStatus } from '../interfaces/project.interface';
import { NotificationType, NotificationPriority } from '../../notification-service/interfaces/notification.interface';
import { BUSINESS_ERRORS, SYSTEM_ERRORS } from '../../common/constants/error-codes';

// Mock dependencies
jest.mock('../repositories/project.repository');
jest.mock('../../notification-service/services/notification.service');
jest.mock('redis');
jest.mock('../../common/utils/logger.util');

describe('ProjectService', () => {
    let container: Container;
    let projectService: ProjectService;
    let mockProjectRepository: jest.Mocked<ProjectRepository>;
    let mockNotificationService: jest.Mocked<NotificationService>;
    let mockCacheService: jest.Mocked<CacheService>;
    let mockLogger: jest.Mocked<Logger>;

    const mockProject: IProject = {
        id: '123',
        name: 'Test Project',
        description: 'Test Description',
        ownerId: 'owner123',
        status: ProjectStatus.DRAFT,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        members: ['member1', 'member2'],
        metadata: {},
        createdAt: new Date(),
        createdBy: 'owner123',
        updatedAt: new Date(),
        updatedBy: 'owner123',
        version: 1
    };

    beforeEach(() => {
        container = new Container();
        
        // Reset all mocks
        mockProjectRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        } as unknown as jest.Mocked<ProjectRepository>;

        mockNotificationService = {
            createNotification: jest.fn()
        } as unknown as jest.Mocked<NotificationService>;

        mockCacheService = {
            get: jest.fn(),
            setex: jest.fn(),
            del: jest.fn()
        } as unknown as jest.Mocked<CacheService>;

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        } as unknown as jest.Mocked<Logger>;

        // Bind mocks to container
        container.bind(ProjectRepository).toConstantValue(mockProjectRepository);
        container.bind(NotificationService).toConstantValue(mockNotificationService);
        container.bind(CacheService).toConstantValue(mockCacheService);
        container.bind(Logger).toConstantValue(mockLogger);
        container.bind(ProjectService).toSelf();

        projectService = container.get(ProjectService);
    });

    describe('Project Creation', () => {
        it('should create project with valid data and set initial status to DRAFT', async () => {
            const projectData = {
                name: 'New Project',
                description: 'Project Description',
                ownerId: 'owner123',
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-12-31'),
                members: ['member1']
            };

            mockProjectRepository.create.mockResolvedValue({ ...mockProject, ...projectData });

            const result = await projectService.createProject(projectData);

            expect(result.status).toBe(ProjectStatus.DRAFT);
            expect(mockProjectRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                ...projectData,
                status: ProjectStatus.DRAFT
            }));
            expect(mockNotificationService.createNotification).toHaveBeenCalledWith(expect.objectContaining({
                type: NotificationType.PROJECT_UPDATED,
                priority: NotificationPriority.HIGH
            }));
        });

        it('should validate required fields during creation', async () => {
            const invalidData = {
                name: '',
                ownerId: 'owner123'
            };

            await expect(projectService.createProject(invalidData as any))
                .rejects.toThrow(BUSINESS_ERRORS.RESOURCE_NOT_FOUND);
        });

        it('should enforce unique project name within workspace', async () => {
            mockProjectRepository.create.mockRejectedValue(new Error(BUSINESS_ERRORS.RESOURCE_EXISTS));

            await expect(projectService.createProject({
                ...mockProject,
                id: undefined
            })).rejects.toThrow(BUSINESS_ERRORS.RESOURCE_EXISTS);
        });
    });

    describe('Project Retrieval', () => {
        it('should return project by ID with complete details', async () => {
            mockProjectRepository.findById.mockResolvedValue(mockProject);
            mockCacheService.get.mockResolvedValue(null);

            const result = await projectService.getProjectById(mockProject.id, mockProject.ownerId);

            expect(result).toEqual(mockProject);
            expect(mockCacheService.setex).toHaveBeenCalled();
        });

        it('should handle non-existent project retrieval', async () => {
            mockProjectRepository.findById.mockResolvedValue(null);
            mockCacheService.get.mockResolvedValue(null);

            await expect(projectService.getProjectById('nonexistent', 'user123'))
                .rejects.toThrow(BUSINESS_ERRORS.RESOURCE_NOT_FOUND);
        });

        it('should return cached project data when available', async () => {
            mockCacheService.get.mockResolvedValue(JSON.stringify(mockProject));

            const result = await projectService.getProjectById(mockProject.id, mockProject.ownerId);

            expect(result).toEqual(mockProject);
            expect(mockProjectRepository.findById).not.toHaveBeenCalled();
        });
    });

    describe('Project Updates', () => {
        it('should update project with valid changes', async () => {
            const updateData = {
                name: 'Updated Project',
                description: 'Updated Description'
            };

            mockProjectRepository.findById.mockResolvedValue(mockProject);
            mockProjectRepository.update.mockResolvedValue({ ...mockProject, ...updateData });

            const result = await projectService.updateProject(
                mockProject.id,
                updateData,
                mockProject.ownerId
            );

            expect(result.name).toBe(updateData.name);
            expect(mockNotificationService.createNotification).toHaveBeenCalled();
        });

        it('should validate status transitions', async () => {
            mockProjectRepository.findById.mockResolvedValue({
                ...mockProject,
                status: ProjectStatus.COMPLETED
            });

            await expect(projectService.updateProject(
                mockProject.id,
                { status: ProjectStatus.DRAFT },
                mockProject.ownerId
            )).rejects.toThrow(BUSINESS_ERRORS.OPERATION_INVALID);
        });

        it('should handle concurrent update conflicts', async () => {
            mockProjectRepository.update.mockRejectedValue(new Error(SYSTEM_ERRORS.CIRCUIT_BREAKER_OPEN));

            await expect(projectService.updateProject(
                mockProject.id,
                { name: 'New Name' },
                mockProject.ownerId
            )).rejects.toThrow(SYSTEM_ERRORS.CIRCUIT_BREAKER_OPEN);
        });
    });

    describe('Project Deletion', () => {
        it('should soft delete project and maintain data integrity', async () => {
            mockProjectRepository.findById.mockResolvedValue(mockProject);

            await projectService.deleteProject(mockProject.id, mockProject.ownerId);

            expect(mockProjectRepository.delete).toHaveBeenCalledWith(mockProject.id);
            expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: NotificationType.PROJECT_UPDATED,
                    metadata: expect.objectContaining({ action: 'deleted' })
                })
            );
        });

        it('should prevent deletion of active projects', async () => {
            mockProjectRepository.findById.mockResolvedValue({
                ...mockProject,
                status: ProjectStatus.ACTIVE
            });

            await expect(projectService.deleteProject(mockProject.id, mockProject.ownerId))
                .rejects.toThrow(BUSINESS_ERRORS.RESOURCE_LOCKED);
        });

        it('should validate deletion permissions', async () => {
            mockProjectRepository.findById.mockResolvedValue(mockProject);

            await expect(projectService.deleteProject(mockProject.id, 'unauthorized_user'))
                .rejects.toThrow(BUSINESS_ERRORS.RESOURCE_NOT_FOUND);
        });
    });
});