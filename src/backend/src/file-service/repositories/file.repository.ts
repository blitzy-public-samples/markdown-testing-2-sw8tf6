/**
 * @fileoverview Repository class for handling file entity database operations with caching and performance optimizations
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client'; // ^5.0.0
import { injectable } from 'inversify'; // ^6.0.1
import Redis from 'ioredis'; // ^5.3.0
import { Logger } from 'winston'; // ^3.8.0
import { IFile, IFileFilter } from '../interfaces/file.interface';
import { FileModel } from '../models/file.model';

const CACHE_TTL = 3600; // 1 hour cache TTL
const MAX_RETRY_ATTEMPTS = 3;
const CACHE_PREFIX = 'file:';

@injectable()
export class FileRepository {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly cacheClient: Redis,
        private readonly logger: Logger
    ) {}

    /**
     * Creates a new file record with optimistic locking and validation
     * @param fileData File data to be created
     * @returns Created file entity with version
     * @throws Error if creation fails or validation errors occur
     */
    async create(fileData: IFile): Promise<FileModel> {
        try {
            // Validate required fields
            this.validateFileData(fileData);

            // Create file record within a transaction
            const file = await this.prisma.$transaction(async (tx) => {
                const created = await tx.file.create({
                    data: {
                        ...fileData,
                        version: 1,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
                return new FileModel(created);
            });

            // Cache the created file
            await this.cacheFile(file);
            
            this.logger.info(`File created successfully: ${file.id}`);
            return file;
        } catch (error) {
            this.logger.error(`File creation failed: ${error.message}`);
            throw new Error(`Failed to create file: ${error.message}`);
        }
    }

    /**
     * Retrieves a file by ID with caching support
     * @param id File identifier
     * @returns Found file entity or null
     */
    async findById(id: string): Promise<FileModel | null> {
        try {
            // Check cache first
            const cached = await this.getCachedFile(id);
            if (cached) {
                this.logger.debug(`Cache hit for file: ${id}`);
                return new FileModel(cached);
            }

            // Query database if not in cache
            const file = await this.prisma.file.findUnique({ where: { id } });
            if (!file) {
                return null;
            }

            const fileModel = new FileModel(file);
            await this.cacheFile(fileModel);
            
            return fileModel;
        } catch (error) {
            this.logger.error(`File retrieval failed: ${error.message}`);
            throw new Error(`Failed to retrieve file: ${error.message}`);
        }
    }

    /**
     * Updates a file record with optimistic locking
     * @param id File identifier
     * @param fileData Updated file data
     * @returns Updated file entity
     * @throws Error if update fails or version conflict occurs
     */
    async update(id: string, fileData: Partial<IFile>): Promise<FileModel> {
        try {
            const currentFile = await this.findById(id);
            if (!currentFile) {
                throw new Error('File not found');
            }

            // Optimistic locking
            const updated = await this.prisma.$transaction(async (tx) => {
                const result = await tx.file.update({
                    where: {
                        id,
                        version: currentFile.version
                    },
                    data: {
                        ...fileData,
                        version: { increment: 1 },
                        updatedAt: new Date()
                    }
                });
                return new FileModel(result);
            });

            // Update cache
            await this.cacheFile(updated);
            
            this.logger.info(`File updated successfully: ${id}`);
            return updated;
        } catch (error) {
            this.logger.error(`File update failed: ${error.message}`);
            throw new Error(`Failed to update file: ${error.message}`);
        }
    }

    /**
     * Finds files based on filter criteria with pagination
     * @param filter Filter criteria for file search
     * @returns Array of matching file entities
     */
    async findByFilter(filter: IFileFilter): Promise<FileModel[]> {
        try {
            const where = this.buildFilterQuery(filter);
            
            const files = await this.prisma.file.findMany({
                where,
                orderBy: { createdAt: 'desc' }
            });

            return files.map(file => new FileModel(file));
        } catch (error) {
            this.logger.error(`File filter query failed: ${error.message}`);
            throw new Error(`Failed to filter files: ${error.message}`);
        }
    }

    /**
     * Deletes a file record with proper cleanup
     * @param id File identifier
     * @returns True if deletion was successful
     */
    async delete(id: string): Promise<boolean> {
        try {
            await this.prisma.$transaction(async (tx) => {
                await tx.file.delete({ where: { id } });
            });

            // Remove from cache
            await this.cacheClient.del(`${CACHE_PREFIX}${id}`);
            
            this.logger.info(`File deleted successfully: ${id}`);
            return true;
        } catch (error) {
            this.logger.error(`File deletion failed: ${error.message}`);
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    /**
     * Validates file data for required fields and constraints
     * @private
     */
    private validateFileData(fileData: IFile): void {
        if (!fileData.filename || !fileData.originalName) {
            throw new Error('Filename and original name are required');
        }
        if (!fileData.mimeType) {
            throw new Error('MIME type is required');
        }
        if (!fileData.size || fileData.size <= 0) {
            throw new Error('Valid file size is required');
        }
        if (!fileData.taskId) {
            throw new Error('Task ID is required');
        }
    }

    /**
     * Builds Prisma query from filter criteria
     * @private
     */
    private buildFilterQuery(filter: IFileFilter): any {
        const query: any = {};

        if (filter.taskId) {
            query.taskId = filter.taskId;
        }
        if (filter.uploadedBy) {
            query.uploadedBy = filter.uploadedBy;
        }
        if (filter.mimeType) {
            query.mimeType = filter.mimeType;
        }
        if (filter.startDate || filter.endDate) {
            query.createdAt = {};
            if (filter.startDate) {
                query.createdAt.gte = filter.startDate;
            }
            if (filter.endDate) {
                query.createdAt.lte = filter.endDate;
            }
        }

        return query;
    }

    /**
     * Retrieves file from cache
     * @private
     */
    private async getCachedFile(id: string): Promise<IFile | null> {
        const cached = await this.cacheClient.get(`${CACHE_PREFIX}${id}`);
        return cached ? JSON.parse(cached) : null;
    }

    /**
     * Caches file data with TTL
     * @private
     */
    private async cacheFile(file: FileModel): Promise<void> {
        await this.cacheClient.setex(
            `${CACHE_PREFIX}${file.id}`,
            CACHE_TTL,
            JSON.stringify(file.toJSON())
        );
    }
}