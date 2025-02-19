/**
 * File Controller Implementation
 * Handles file management operations with comprehensive validation, security, and performance optimization
 * @version 1.0.0
 */

import { controller, httpGet, httpPost, httpDelete } from 'inversify-express-utils'; // ^6.4.3
import { inject, injectable } from 'inversify'; // ^6.0.1
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes'; // ^2.2.0
import multer from 'multer'; // ^1.4.5-lts.1
import { FileService } from '../services/file.service';
import { IFile } from '../interfaces/file.interface';
import { validateFileAccess } from '../middleware/auth.middleware';
import { cache } from '../middleware/cache.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';
import { Logger } from 'winston';

// File upload configuration
const upload = multer({
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max file size
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

@controller('/api/files')
@injectable()
export class FileController {
    constructor(
        @inject('FileService') private fileService: FileService,
        @inject('Logger') private logger: Logger
    ) {}

    /**
     * Handles file upload with comprehensive validation and security checks
     * @route POST /api/files/upload
     */
    @httpPost('/upload')
    @rateLimit({ windowMs: 60000, max: 10 }) // 10 uploads per minute
    async uploadFile(req: Request, res: Response): Promise<Response> {
        try {
            const uploadMiddleware = upload.single('file');

            return new Promise((resolve, reject) => {
                uploadMiddleware(req, res, async (err) => {
                    if (err) {
                        this.logger.error(`Upload middleware error: ${err.message}`);
                        return resolve(res.status(StatusCodes.BAD_REQUEST).json({
                            error: 'File upload failed',
                            details: err.message
                        }));
                    }

                    try {
                        if (!req.file) {
                            throw new Error('No file provided');
                        }

                        const taskId = req.body.taskId;
                        if (!taskId) {
                            throw new Error('Task ID is required');
                        }

                        const userId = req.user?.id;
                        if (!userId) {
                            throw new Error('User not authenticated');
                        }

                        const uploadedFile = await this.fileService.uploadFile(
                            req.file,
                            taskId,
                            userId
                        );

                        this.logger.info(`File uploaded successfully: ${uploadedFile.id}`);
                        return resolve(res.status(StatusCodes.CREATED).json(uploadedFile));
                    } catch (error) {
                        this.logger.error(`File upload error: ${error.message}`);
                        return resolve(res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                            error: 'File upload failed',
                            details: error.message
                        }));
                    }
                });
            });
        } catch (error) {
            this.logger.error(`Unexpected upload error: ${error.message}`);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                error: 'Unexpected error during file upload',
                details: error.message
            });
        }
    }

    /**
     * Streams file download with proper security checks and performance optimization
     * @route GET /api/files/:fileId/download
     */
    @httpGet('/:fileId/download')
    @validateFileAccess()
    async downloadFile(req: Request, res: Response): Promise<void> {
        try {
            const { fileId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                throw new Error('User not authenticated');
            }

            const { stream, metadata } = await this.fileService.downloadFile(fileId, userId);

            // Set security headers
            res.setHeader('Content-Security-Policy', "default-src 'self'");
            res.setHeader('X-Content-Type-Options', 'nosniff');

            // Set content headers
            res.setHeader('Content-Type', metadata.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
            res.setHeader('Content-Length', metadata.size);

            // Enable compression for large files
            if (metadata.size > 1024 * 1024) { // 1MB
                res.setHeader('Content-Encoding', 'gzip');
            }

            this.logger.info(`File download started: ${fileId}`);
            stream.pipe(res).on('error', (error) => {
                this.logger.error(`Stream error: ${error.message}`);
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).end();
            });
        } catch (error) {
            this.logger.error(`Download error: ${error.message}`);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                error: 'File download failed',
                details: error.message
            });
        }
    }

    /**
     * Handles file deletion with proper validation and cleanup
     * @route DELETE /api/files/:fileId
     */
    @httpDelete('/:fileId')
    @validateFileAccess()
    async deleteFile(req: Request, res: Response): Promise<Response> {
        try {
            const { fileId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                throw new Error('User not authenticated');
            }

            await this.fileService.deleteFile(fileId, userId);

            this.logger.info(`File deleted successfully: ${fileId}`);
            return res.status(StatusCodes.NO_CONTENT).send();
        } catch (error) {
            this.logger.error(`Delete error: ${error.message}`);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                error: 'File deletion failed',
                details: error.message
            });
        }
    }

    /**
     * Retrieves file metadata with caching support
     * @route GET /api/files/:fileId
     */
    @httpGet('/:fileId')
    @validateFileAccess()
    @cache('5m') // Cache for 5 minutes
    async getFileMetadata(req: Request, res: Response): Promise<Response> {
        try {
            const { fileId } = req.params;
            const metadata = await this.fileService.getFileMetadata(fileId);

            // Set ETag for caching
            const etag = `"${metadata.version}"`;
            res.setHeader('ETag', etag);

            if (req.headers['if-none-match'] === etag) {
                return res.status(StatusCodes.NOT_MODIFIED).send();
            }

            this.logger.info(`Metadata retrieved: ${fileId}`);
            return res.status(StatusCodes.OK).json(metadata);
        } catch (error) {
            this.logger.error(`Metadata retrieval error: ${error.message}`);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                error: 'Failed to retrieve file metadata',
                details: error.message
            });
        }
    }
}