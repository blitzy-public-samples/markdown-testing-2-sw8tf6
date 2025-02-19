/**
 * @fileoverview Defines interfaces for task comment functionality including hierarchical comments,
 * mentions, attachments and query capabilities
 * @version 1.0.0
 */

import { IBaseAuditableEntity } from '../../common/interfaces/base.interface';

/**
 * Interface representing a comment attachment
 */
interface ICommentAttachment {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
}

/**
 * Interface representing a user mention in a comment
 */
interface ICommentMention {
    userId: string;
    username: string;
    notified: boolean;
}

/**
 * Core comment entity interface extending base auditable entity
 * Supports hierarchical comments, file attachments, and user mentions
 */
export interface IComment extends IBaseAuditableEntity {
    /** ID of the task this comment belongs to */
    taskId: string;

    /** Comment content/message */
    content: string;

    /** Array of file attachments associated with the comment */
    attachments: Array<ICommentAttachment>;

    /** ID of the parent comment if this is a reply, null for top-level comments */
    parentCommentId: string | null;

    /** Array of users mentioned in the comment */
    mentions: Array<ICommentMention>;

    /** Nesting level of the comment in the hierarchy */
    depth: number;

    /** Flag indicating if the comment has been edited */
    isEdited: boolean;
}

/**
 * DTO interface for creating new comments
 * Includes validation for required fields and file upload support
 */
export interface ICreateCommentDTO {
    /** ID of the task to create comment for */
    taskId: string;

    /** Comment content/message */
    content: string;

    /** Array of files to be attached to the comment */
    attachments: Array<{
        name: string;
        type: string;
        size: number;
        data: Buffer;
    }>;

    /** Optional parent comment ID for replies */
    parentCommentId: string | null;

    /** Array of user IDs mentioned in the comment */
    mentions: string[];
}

/**
 * DTO interface for updating existing comments
 * Supports modifying content, attachments, and mentions
 */
export interface IUpdateCommentDTO {
    /** Updated comment content */
    content: string;

    /** Updated attachments - can include existing and new files */
    attachments: Array<{
        id?: string;  // Existing attachment ID
        name: string;
        type: string;
        size: number;
        data?: Buffer;  // New file data
    }>;

    /** Updated array of mentioned user IDs */
    mentions: string[];
}

/**
 * Interface for comment query options
 * Provides comprehensive filtering and pagination capabilities
 */
export interface ICommentQueryOptions {
    /** Filter by task ID */
    taskId: string;

    /** Filter by comment creator */
    createdBy: string;

    /** Filter by parent comment ID */
    parentCommentId: string | null;

    /** Include nested replies in the result */
    includeReplies: boolean;

    /** Maximum depth of nested replies to retrieve */
    maxDepth: number;

    /** Page number for pagination */
    page: number;

    /** Number of items per page */
    limit: number;

    /** Field to sort by */
    sortBy: 'createdAt' | 'updatedAt';

    /** Sort direction */
    sortOrder: 'asc' | 'desc';
}