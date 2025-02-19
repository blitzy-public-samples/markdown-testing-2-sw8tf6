import { Container } from 'inversify';
import { faker } from '@faker-js/faker';
import { CacheService } from 'node-cache';
import { NotificationService } from '@socket.io/client';
import { TaskController } from '../controllers/task.controller';
import { TaskService } from '../services/task.service';
import { TaskRepository } from '../repositories/task.repository';
import { 
    ITask, 
    ICreateTaskDTO, 
    IUpdateTaskDTO,
    TaskStatus,
    TaskPriority,
    ITaskFilter 
} from '../interfaces/task.interface';

// Test container setup
const container = new Container();
let taskController: TaskController;
let taskService: TaskService;
let taskRepository: TaskRepository;
let cacheService: CacheService;
let notificationService: NotificationService;

// Mock data generators
const generateMockTask = (): ICreateTaskDTO => ({
    title: faker.lorem.sentence(4),
    description: faker.lorem.paragraph(),
    projectId: faker.string.uuid(),
    assigneeId: faker.string.uuid(),
    priority: TaskPriority.MEDIUM,
    dueDate: faker.date.future(),
    attachments: [],
    tags: [faker.lorem.word(), faker.lorem.word()]
});

const generateMockUser = () => ({
    id: faker.string.uuid(),
    role: faker.helpers.arrayElement(['ADMIN', 'MANAGER', 'TEAM_LEAD', 'USER'])
});

describe('TaskController Integration Tests', () => {
    beforeAll(async () => {
        // Setup test container with mocks
        container.bind(TaskController).toSelf();
        container.bind(TaskService).toSelf();
        container.bind(TaskRepository).toSelf();
        container.bind(CacheService).toSelf();
        container.bind(NotificationService).toSelf();

        taskController = container.get(TaskController);
        taskService = container.get(TaskService);
        taskRepository = container.get(TaskRepository);
        cacheService = container.get(CacheService);
        notificationService = container.get(NotificationService);

        // Setup spies
        jest.spyOn(taskRepository, 'createTask');
        jest.spyOn(taskRepository, 'findById');
        jest.spyOn(cacheService, 'get');
        jest.spyOn(cacheService, 'set');
        jest.spyOn(notificationService, 'sendTaskAssignmentNotification');
    });

    afterAll(async () => {
        await container.unbindAll();
        jest.clearAllMocks();
    });

    describe('Task Creation', () => {
        it('should create a task successfully with valid data', async () => {
            const mockTask = generateMockTask();
            const mockUser = generateMockUser();

            const result = await taskController.createTask(
                mockTask,
                mockUser.id,
                mockUser.role
            );

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.title).toBe(mockTask.title);
            expect(taskRepository.createTask).toHaveBeenCalledWith(
                mockTask,
                mockUser.id
            );
            expect(notificationService.sendTaskAssignmentNotification).toHaveBeenCalled();
        });

        it('should validate required fields during task creation', async () => {
            const invalidTask = {
                title: '', // Invalid - required
                projectId: faker.string.uuid(),
                assigneeId: faker.string.uuid()
            } as ICreateTaskDTO;

            await expect(
                taskController.createTask(
                    invalidTask,
                    faker.string.uuid(),
                    'MANAGER'
                )
            ).rejects.toThrow('Title is required');
        });

        it('should enforce task limit per project', async () => {
            const mockTask = generateMockTask();
            jest.spyOn(taskRepository, 'findByFilter').mockResolvedValue([[],1000]);

            await expect(
                taskController.createTask(
                    mockTask,
                    faker.string.uuid(),
                    'MANAGER'
                )
            ).rejects.toThrow('Project has reached maximum task limit');
        });
    });

    describe('Task Updates', () => {
        let existingTask: ITask;

        beforeEach(async () => {
            existingTask = {
                id: faker.string.uuid(),
                ...generateMockTask(),
                status: TaskStatus.TODO,
                createdAt: new Date(),
                updatedAt: new Date(),
                version: 1
            } as ITask;

            jest.spyOn(taskRepository, 'findById').mockResolvedValue(existingTask);
        });

        it('should update task status with valid transition', async () => {
            const updateDto: IUpdateTaskDTO = {
                status: TaskStatus.IN_PROGRESS
            };

            const result = await taskController.updateTask(
                existingTask.id,
                updateDto,
                existingTask.assigneeId,
                'MANAGER'
            );

            expect(result.status).toBe(TaskStatus.IN_PROGRESS);
            expect(cacheService.del).toHaveBeenCalledWith(`tasks:${existingTask.id}`);
        });

        it('should reject invalid status transitions', async () => {
            const updateDto: IUpdateTaskDTO = {
                status: TaskStatus.COMPLETED // Invalid direct transition from TODO
            };

            await expect(
                taskController.updateTask(
                    existingTask.id,
                    updateDto,
                    existingTask.assigneeId,
                    'MANAGER'
                )
            ).rejects.toThrow('Invalid status transition');
        });
    });

    describe('Task Retrieval', () => {
        it('should retrieve task from cache if available', async () => {
            const mockTask = {
                id: faker.string.uuid(),
                ...generateMockTask(),
                status: TaskStatus.TODO
            } as ITask;

            jest.spyOn(cacheService, 'get').mockResolvedValue(mockTask);

            const result = await taskController.getTaskById(mockTask.id);

            expect(result).toEqual(mockTask);
            expect(cacheService.get).toHaveBeenCalledWith(`tasks:${mockTask.id}`);
            expect(taskRepository.findById).not.toHaveBeenCalled();
        });

        it('should fetch and cache task if not in cache', async () => {
            const mockTask = {
                id: faker.string.uuid(),
                ...generateMockTask(),
                status: TaskStatus.TODO
            } as ITask;

            jest.spyOn(cacheService, 'get').mockResolvedValue(null);
            jest.spyOn(taskRepository, 'findById').mockResolvedValue(mockTask);

            const result = await taskController.getTaskById(mockTask.id);

            expect(result).toEqual(mockTask);
            expect(taskRepository.findById).toHaveBeenCalledWith(mockTask.id);
            expect(cacheService.set).toHaveBeenCalledWith(
                `tasks:${mockTask.id}`,
                mockTask,
                3600
            );
        });
    });

    describe('Task Filtering', () => {
        it('should filter tasks by multiple criteria', async () => {
            const filter: ITaskFilter = {
                projectId: faker.string.uuid(),
                status: TaskStatus.IN_PROGRESS,
                priority: TaskPriority.HIGH,
                page: 1,
                limit: 10
            };

            const mockTasks = Array(5).fill(null).map(() => ({
                id: faker.string.uuid(),
                ...generateMockTask(),
                status: TaskStatus.IN_PROGRESS,
                priority: TaskPriority.HIGH
            }));

            jest.spyOn(taskRepository, 'findByFilter').mockResolvedValue([mockTasks, 5]);

            const result = await taskController.getTasks(filter);

            expect(result.tasks).toHaveLength(5);
            expect(result.total).toBe(5);
            expect(taskRepository.findByFilter).toHaveBeenCalledWith(filter);
        });
    });

    describe('Performance Benchmarks', () => {
        it('should create task within 2 second SLA', async () => {
            const startTime = Date.now();
            const mockTask = generateMockTask();

            await taskController.createTask(
                mockTask,
                faker.string.uuid(),
                'MANAGER'
            );

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(2000);
        });

        it('should handle concurrent task updates', async () => {
            const mockTask = {
                id: faker.string.uuid(),
                ...generateMockTask(),
                status: TaskStatus.TODO
            } as ITask;

            const updatePromises = Array(10).fill(null).map(() => 
                taskController.updateTask(
                    mockTask.id,
                    { priority: TaskPriority.HIGH },
                    faker.string.uuid(),
                    'MANAGER'
                )
            );

            await expect(Promise.all(updatePromises)).resolves.toBeDefined();
        });
    });

    describe('Authorization', () => {
        it('should enforce role-based task creation', async () => {
            const mockTask = generateMockTask();

            await expect(
                taskController.createTask(
                    mockTask,
                    faker.string.uuid(),
                    'USER' // Invalid role for task creation
                )
            ).rejects.toThrow('User not authorized to create tasks');
        });

        it('should allow task updates by assignee', async () => {
            const mockTask = {
                id: faker.string.uuid(),
                ...generateMockTask(),
                status: TaskStatus.TODO
            } as ITask;

            const result = await taskController.updateTask(
                mockTask.id,
                { priority: TaskPriority.HIGH },
                mockTask.assigneeId,
                'USER'
            );

            expect(result.priority).toBe(TaskPriority.HIGH);
        });
    });
});