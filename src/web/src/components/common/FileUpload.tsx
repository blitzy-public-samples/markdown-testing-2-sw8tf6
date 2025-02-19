import React, { useCallback, useRef, useState } from 'react';
import classnames from 'classnames';
import { Button, ButtonProps } from './Button';
import styles from './FileUpload.module.css';

// File metadata interface
interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  checksum?: string;
}

// Error types for file upload
interface FileUploadError {
  code: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'MALICIOUS_CONTENT' | 'UPLOAD_FAILED';
  message: string;
  file?: File;
}

// Validation result interface
interface ValidationResult {
  isValid: boolean;
  error?: FileUploadError;
  metadata?: FileMetadata;
}

// Component props interface
export interface FileUploadProps {
  onFileSelect: (files: File[], metadata?: FileMetadata[]) => void;
  maxSize?: number; // in bytes
  allowedMimeTypes?: string[];
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  onError?: (error: FileUploadError) => void;
  onProgress?: (progress: number) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  maxSize = 10 * 1024 * 1024, // 10MB default
  allowedMimeTypes = ['*/*'],
  multiple = false,
  disabled = false,
  className,
  onError,
  onProgress,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate individual file
  const validateFile = async (file: File): Promise<ValidationResult> => {
    // Check file size
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
          file,
        },
      };
    }

    // Check MIME type
    if (allowedMimeTypes[0] !== '*/*' && !allowedMimeTypes.includes(file.type)) {
      return {
        isValid: false,
        error: {
          code: 'INVALID_TYPE',
          message: `File type ${file.type} not allowed`,
          file,
        },
      };
    }

    // Generate file metadata
    const metadata: FileMetadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    };

    // Optional: Generate checksum for file integrity
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      metadata.checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.warn('Checksum generation failed:', error);
    }

    return { isValid: true, metadata };
  };

  // Handle file selection
  const handleFiles = async (files: FileList | File[]) => {
    setIsLoading(true);
    const validFiles: File[] = [];
    const metadataList: FileMetadata[] = [];

    try {
      for (const file of Array.from(files)) {
        const result = await validateFile(file);
        
        if (result.isValid && result.metadata) {
          validFiles.push(file);
          metadataList.push(result.metadata);
        } else if (result.error && onError) {
          onError(result.error);
        }
      }

      if (validFiles.length > 0) {
        onFileSelect(validFiles, metadataList);
        if (onProgress) onProgress(100);
      }
    } catch (error) {
      onError?.({
        code: 'UPLOAD_FAILED',
        message: 'File processing failed',
      });
    } finally {
      setIsLoading(false);
      setIsDragging(false);
    }
  };

  // Handle drag events
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled && !isLoading) {
      setIsDragging(true);
    }
  }, [disabled, isLoading]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (disabled || isLoading) return;

    const droppedFiles = event.dataTransfer.files;
    if (!multiple && droppedFiles.length > 1) {
      onError?.({
        code: 'INVALID_TYPE',
        message: 'Multiple files not allowed',
      });
      return;
    }

    handleFiles(droppedFiles);
  }, [disabled, isLoading, multiple, onError]);

  // Handle button click
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file input change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  const containerClasses = classnames(
    styles.container,
    {
      [styles.dragging]: isDragging,
      [styles.disabled]: disabled,
      [styles.loading]: isLoading,
    },
    className
  );

  return (
    <div
      className={containerClasses}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-disabled={disabled}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <input
        ref={fileInputRef}
        type="file"
        className={styles.input}
        onChange={handleInputChange}
        accept={allowedMimeTypes.join(',')}
        multiple={multiple}
        disabled={disabled || isLoading}
        aria-hidden="true"
        tabIndex={-1}
      />
      
      <div className={styles.content}>
        <div className={styles.icon} aria-hidden="true">
          {isLoading ? (
            <svg className={styles.spinner} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" strokeWidth="3" />
            </svg>
          ) : (
            <svg className={styles.uploadIcon} viewBox="0 0 24 24">
              <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          )}
        </div>
        
        <div className={styles.text}>
          <span className={styles.primary}>
            {isLoading ? 'Processing...' : 'Drop files here or'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            isDisabled={disabled || isLoading}
            onClick={handleButtonClick}
            aria-label="Select files to upload"
          >
            browse
          </Button>
        </div>
        
        <div className={styles.info}>
          {multiple ? 'Multiple files allowed' : 'Single file only'} •
          Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB
        </div>
      </div>
    </div>
  );
};

export default FileUpload;