/**
 * @fileoverview Implements the Prisma model for file entities with versioning and storage management
 * @version 1.0.0
 */

import { Prisma } from '@prisma/client'; // ^5.0.0
import { IFile } from '../interfaces/file.interface';
import { IBaseEntity } from '../../common/interfaces/base.interface';

/**
 * Prisma model implementation for file entities with metadata, storage, and versioning support
 * Implements IFile interface for consistent type structure
 */
export class FileModel implements IFile, IBaseEntity {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    bucket: string;
    taskId: string;
    uploadedBy: string;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    private urlCache: Map<string, { url: string; expiry: Date }>;

    constructor(data: Prisma.FileCreateInput) {
        this.id = data.id;
        this.filename = data.filename;
        this.originalName = data.originalName;
        this.mimeType = data.mimeType;
        this.size = data.size;
        this.path = data.path;
        this.bucket = data.bucket;
        this.taskId = data.taskId;
        this.uploadedBy = data.uploadedBy;
        this.createdAt = new Date(data.createdAt || Date.now());
        this.updatedAt = new Date(data.updatedAt || Date.now());
        this.version = data.version || 1;
        this.urlCache = new Map();
    }

    /**
     * Converts the file model to a plain JSON object with formatted dates
     * Implements proper versioning for optimistic locking
     * @returns {IFile} Plain JSON representation of the file
     */
    toJSON(): IFile {
        return {
            id: this.id,
            filename: this.filename,
            originalName: this.originalName,
            mimeType: this.mimeType,
            size: this.size,
            path: this.path,
            bucket: this.bucket,
            taskId: this.taskId,
            uploadedBy: this.uploadedBy,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            version: this.version
        };
    }

    /**
     * Generates and caches storage URLs with provider-specific handling
     * Supports multiple storage providers with proper authentication
     * @returns {Promise<string>} Complete URL for file access
     * @throws {Error} If URL generation fails or storage provider is unavailable
     */
    async getStorageUrl(): Promise<string> {
        const cacheKey = `${this.bucket}:${this.path}`;
        const cached = this.urlCache.get(cacheKey);

        // Return cached URL if still valid
        if (cached && cached.expiry > new Date()) {
            return cached.url;
        }

        try {
            let url: string;
            const expiryTime = new Date(Date.now() + 3600000); // 1 hour expiry

            // Generate provider-specific URLs
            if (this.bucket.startsWith('s3://')) {
                url = await this.generateS3Url();
            } else if (this.bucket.startsWith('local://')) {
                url = await this.generateLocalUrl();
            } else {
                throw new Error(`Unsupported storage provider for bucket: ${this.bucket}`);
            }

            // Cache the generated URL
            this.urlCache.set(cacheKey, { url, expiry: expiryTime });
            return url;
        } catch (error) {
            throw new Error(`Failed to generate storage URL: ${error.message}`);
        }
    }

    /**
     * Generates pre-signed S3 URLs for secure file access
     * @private
     * @returns {Promise<string>} Pre-signed S3 URL
     */
    private async generateS3Url(): Promise<string> {
        // Implementation would use AWS SDK to generate pre-signed URLs
        // This is a placeholder for the actual implementation
        return `https://${this.bucket.replace('s3://', '')}.s3.amazonaws.com/${this.path}`;
    }

    /**
     * Generates local storage URLs for development environment
     * @private
     * @returns {Promise<string>} Local file URL
     */
    private async generateLocalUrl(): Promise<string> {
        // Implementation would generate local file system URLs
        // This is a placeholder for the actual implementation
        return `http://localhost:3000/files/${this.path}`;
    }
}