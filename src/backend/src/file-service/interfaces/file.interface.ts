/**
 * @fileoverview Defines core interfaces for file management and storage functionality
 * @version 1.0.0
 */

import { IBaseEntity } from '../../common/interfaces/base.interface';

/**
 * Core interface for file entity with metadata and storage information
 * Extends IBaseEntity for consistent entity structure
 */
export interface IFile extends IBaseEntity {
    /** Original filename provided during upload */
    originalName: string;

    /** Sanitized and uniquely generated filename for storage */
    filename: string;

    /** MIME type of the file for content type validation */
    mimeType: string;

    /** File size in bytes */
    size: number;

    /** Storage path within the bucket */
    path: string;

    /** Storage bucket identifier */
    bucket: string;

    /** Associated task identifier */
    taskId: string;

    /** User identifier who uploaded the file */
    uploadedBy: string;
}

/**
 * Interface for filtering file queries
 * Supports complex search operations across file metadata
 */
export interface IFileFilter {
    /** Filter by associated task */
    taskId?: string;

    /** Filter by uploader */
    uploadedBy?: string;

    /** Filter by file type */
    mimeType?: string;

    /** Filter by upload date range - start */
    startDate?: Date;

    /** Filter by upload date range - end */
    endDate?: Date;
}

/**
 * Interface for file upload configuration options
 * Defines constraints and storage preferences for file uploads
 */
export interface IFileUploadOptions {
    /** Maximum allowed file size in bytes */
    maxSize: number;

    /** List of allowed MIME types */
    allowedMimeTypes: string[];

    /** Whether to preserve the original filename */
    preserveOriginalName: boolean;

    /** Target storage bucket */
    bucket: string;
}