/**
 * @fileoverview Centralized logging utility for standardized logging across microservices
 * Provides structured logging with correlation IDs, log rotation, and retention policies
 * @version 1.0.0
 */

import winston from 'winston';  // v3.x
import DailyRotateFile from 'winston-daily-rotate-file';  // v4.x
import { IMonitoringConfig } from '../interfaces/config.interface';
import { SYSTEM_ERRORS } from '../constants/error-codes';

/**
 * Structured log metadata interface
 */
interface LogMetadata extends Record<string, any> {
  correlationId?: string;
  serviceName: string;
  serviceVersion: string;
  timestamp: string;
  processId: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

/**
 * Enterprise-grade logging utility with support for structured logging,
 * correlation IDs, and automated log rotation
 */
export class Logger {
  private logger: winston.Logger;
  private correlationId: string;
  private readonly serviceName: string;
  private readonly serviceVersion: string;

  /**
   * Creates a new Logger instance with the specified configuration
   * @param config - Monitoring configuration settings
   * @param serviceName - Name of the service for log context
   * @param serviceVersion - Version of the service for log context
   */
  constructor(
    config: IMonitoringConfig,
    serviceName: string,
    serviceVersion: string
  ) {
    this.serviceName = serviceName;
    this.serviceVersion = serviceVersion;
    this.correlationId = '';

    // Configure log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'ISO' }),
      winston.format.json(),
      winston.format.errors({ stack: true })
    );

    // Configure transports
    const transports: winston.transport[] = [
      // Console transport with color coding
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      // File rotation transport
      new DailyRotateFile({
        filename: `logs/${serviceName}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: config.maxFileSize || '20m',
        maxFiles: `${config.retentionDays || 30}d`,
        format: logFormat
      })
    ];

    // Initialize Winston logger
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: logFormat,
      transports,
      exitOnError: false
    });
  }

  /**
   * Enriches log metadata with standard context information
   * @param meta - Additional metadata to include in log
   * @returns Enriched metadata object
   */
  private enrichMetadata(meta: Record<string, any> = {}): LogMetadata {
    const memUsage = process.memoryUsage();
    
    return {
      ...meta,
      correlationId: this.correlationId,
      serviceName: this.serviceName,
      serviceVersion: this.serviceVersion,
      timestamp: new Date().toISOString(),
      processId: process.pid,
      memoryUsage: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      }
    };
  }

  /**
   * Sets the correlation ID for distributed tracing
   * @param correlationId - Unique identifier for request tracing
   */
  public setCorrelationId(correlationId: string): void {
    if (!correlationId || typeof correlationId !== 'string') {
      throw new Error('Invalid correlation ID format');
    }
    this.correlationId = correlationId;
  }

  /**
   * Logs a debug level message
   * @param message - Log message
   * @param meta - Additional metadata
   */
  public debug(message: string, meta: Record<string, any> = {}): void {
    this.logger.debug(message, this.enrichMetadata(meta));
  }

  /**
   * Logs an info level message
   * @param message - Log message
   * @param meta - Additional metadata
   */
  public info(message: string, meta: Record<string, any> = {}): void {
    this.logger.info(message, this.enrichMetadata(meta));
  }

  /**
   * Logs a warning level message
   * @param message - Log message
   * @param meta - Additional metadata
   */
  public warn(message: string, meta: Record<string, any> = {}): void {
    this.logger.warn(message, this.enrichMetadata(meta));
  }

  /**
   * Logs an error level message with enhanced error details
   * @param message - Error message
   * @param error - Error object
   * @param meta - Additional metadata
   */
  public error(message: string, error: Error, meta: Record<string, any> = {}): void {
    const errorMeta = {
      ...meta,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code || SYSTEM_ERRORS.INTERNAL_ERROR
      }
    };
    
    this.logger.error(message, this.enrichMetadata(errorMeta));
  }

  /**
   * Flushes any buffered logs and closes transports
   * @returns Promise that resolves when logger is closed
   */
  public async close(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }
}