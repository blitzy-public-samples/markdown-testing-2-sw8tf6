/**
 * Comprehensive test suite for FileService
 * Tests file upload, download, deletion, and metadata operations with S3 storage integration
 * @version 1.0.0
 */

import { FileService } from '../services/file.service';
import { FileRepository } from '../repositories/file.repository';
import { IFile } from '../interfaces/file.interface';
import { S3 } from 'aws-sdk'; // ^2.1.0
import { Redis } from 'ioredis'; // ^5.3.0
import { Logger } from 'winston'; // ^3.8.0
import { ClamAV } from 'node-clamav'; // ^1.0.0
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import MockAWS from 'mock-aws-s3'; // ^4.0.0

// Mock dependencies
jest.mock('aws-sdk');
jest.mock('ioredis');
jest.mock('winston');
jest.mock('node-clamav');
jest.mock('../repositories/file.repository');

describe('FileService', () => {
    let fileService: FileService;
    let fileRepository: jest.Mocked<FileRepository>;
    let mockS3: jest.Mocked<S3>;
    let mockRedis: jest.Mocked<Redis>;
    let mockLogger: jest.Mocked<Logger>;
    let mockVirusScanner: jest.Mocked<ClamAV>;

    const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test-document.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test file content'),
        size: 1024,
        destination: '',
        filename: '',
        path: '',
        stream: new Readable()
    };

    const mockFileData: IFile = {
        id: uuidv4(),
        filename: 'test-document.pdf',
        originalName: 'test-document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        path: 'tasks/123/test-document.pdf',
        bucket: 'test-bucket',
        taskId: '123',
        uploadedBy: 'user123',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
    };

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Initialize mocks
        fileRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            findByFilter: jest.fn()
        } as any;

        mockS3 = {
            putObject: jest.fn().mockReturnValue({ promise: () => Promise.resolve() }),
            getObject: jest.fn().mockReturnValue({
                createReadStream: () => new Readable(),
                promise: () => Promise.resolve({ Body: Buffer.from('test') })
            }),
            deleteObject: jest.fn().mockReturnValue({ promise: () => Promise.resolve() })
        } as any;

        mockRedis = new Redis() as any;
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        } as any;

        mockVirusScanner = {
            scanBuffer: jest.fn().mockResolvedValue(true)
        } as any;

        // Initialize FileService with mocks
        fileService = new FileService(fileRepository, mockRedis as any, mockLogger as any);
        (fileService as any).s3Client = mockS3;
        (fileService as any).virusScanner = mockVirusScanner;
    });

    describe('uploadFile', () => {
        it('should successfully upload a file and create metadata', async () => {
            fileRepository.create.mockResolvedValue(mockFileData);

            const result = await fileService.uploadFile(mockFile, '123', 'user123');

            expect(mockVirusScanner.scanBuffer).toHaveBeenCalledWith(mockFile.buffer);
            expect(mockS3.putObject).toHaveBeenCalledWith(expect.objectContaining({
                Bucket: expect.any(String),
                Key: expect.stringContaining('tasks/123/'),
                Body: mockFile.buffer,
                ContentType: mockFile.mimetype
            }));
            expect(fileRepository.create).toHaveBeenCalled();
            expect(result).toEqual(mockFileData);
        });

        it('should throw error when file size exceeds limit', async () => {
            const largeFile = { ...mockFile, size: 200 * 1024 * 1024 };

            await expect(fileService.uploadFile(largeFile, '123', 'user123'))
                .rejects.toThrow('File size exceeds limit');
        });

        it('should throw error for unsupported file types', async () => {
            const invalidFile = { ...mockFile, mimetype: 'application/exe' };

            await expect(fileService.uploadFile(invalidFile, '123', 'user123'))
                .rejects.toThrow('File type not allowed');
        });

        it('should handle virus scan failures', async () => {
            mockVirusScanner.scanBuffer.mockResolvedValue(false);

            await expect(fileService.uploadFile(mockFile, '123', 'user123'))
                .rejects.toThrow('File failed virus scan');
        });
    });

    describe('downloadFile', () => {
        it('should successfully download an existing file', async () => {
            fileRepository.findById.mockResolvedValue(mockFileData);

            const result = await fileService.downloadFile(mockFileData.id, 'user123');

            expect(fileRepository.findById).toHaveBeenCalledWith(mockFileData.id);
            expect(mockS3.getObject).toHaveBeenCalledWith({
                Bucket: mockFileData.bucket,
                Key: mockFileData.path
            });
            expect(result).toHaveProperty('stream');
            expect(result).toHaveProperty('metadata', mockFileData);
        });

        it('should throw error when file does not exist', async () => {
            fileRepository.findById.mockResolvedValue(null);

            await expect(fileService.downloadFile('nonexistent', 'user123'))
                .rejects.toThrow('File not found');
        });

        it('should throw error when user lacks access permissions', async () => {
            fileRepository.findById.mockResolvedValue({
                ...mockFileData,
                uploadedBy: 'different-user'
            });

            await expect(fileService.downloadFile(mockFileData.id, 'user123'))
                .rejects.toThrow('Access denied');
        });
    });

    describe('deleteFile', () => {
        it('should successfully delete an existing file', async () => {
            fileRepository.findById.mockResolvedValue(mockFileData);
            fileRepository.delete.mockResolvedValue(true);

            const result = await fileService.deleteFile(mockFileData.id, 'user123');

            expect(fileRepository.findById).toHaveBeenCalledWith(mockFileData.id);
            expect(mockS3.deleteObject).toHaveBeenCalledWith({
                Bucket: mockFileData.bucket,
                Key: mockFileData.path
            });
            expect(fileRepository.delete).toHaveBeenCalledWith(mockFileData.id);
            expect(result).toBe(true);
        });

        it('should throw error when file does not exist', async () => {
            fileRepository.findById.mockResolvedValue(null);

            await expect(fileService.deleteFile('nonexistent', 'user123'))
                .rejects.toThrow('File not found');
        });

        it('should throw error when user lacks deletion permissions', async () => {
            fileRepository.findById.mockResolvedValue({
                ...mockFileData,
                uploadedBy: 'different-user'
            });

            await expect(fileService.deleteFile(mockFileData.id, 'user123'))
                .rejects.toThrow('Access denied');
        });
    });

    describe('getFileMetadata', () => {
        it('should return complete metadata for existing file', async () => {
            fileRepository.findById.mockResolvedValue(mockFileData);

            const result = await fileService.getFileMetadata(mockFileData.id);

            expect(fileRepository.findById).toHaveBeenCalledWith(mockFileData.id);
            expect(result).toEqual(mockFileData);
        });

        it('should throw error when file does not exist', async () => {
            fileRepository.findById.mockResolvedValue(null);

            await expect(fileService.getFileMetadata('nonexistent'))
                .rejects.toThrow('File not found');
        });

        it('should handle repository errors gracefully', async () => {
            fileRepository.findById.mockRejectedValue(new Error('Database error'));

            await expect(fileService.getFileMetadata(mockFileData.id))
                .rejects.toThrow('Failed to retrieve file metadata');
        });
    });

    describe('error handling', () => {
        it('should handle S3 upload failures', async () => {
            mockS3.putObject.mockReturnValue({
                promise: () => Promise.reject(new Error('S3 error'))
            });

            await expect(fileService.uploadFile(mockFile, '123', 'user123'))
                .rejects.toThrow('File upload failed');
        });

        it('should handle S3 download failures', async () => {
            fileRepository.findById.mockResolvedValue(mockFileData);
            mockS3.getObject.mockReturnValue({
                promise: () => Promise.reject(new Error('S3 error'))
            });

            await expect(fileService.downloadFile(mockFileData.id, 'user123'))
                .rejects.toThrow('File download failed');
        });

        it('should handle repository failures during deletion', async () => {
            fileRepository.findById.mockResolvedValue(mockFileData);
            fileRepository.delete.mockRejectedValue(new Error('Database error'));

            await expect(fileService.deleteFile(mockFileData.id, 'user123'))
                .rejects.toThrow('File deletion failed');
        });
    });
});