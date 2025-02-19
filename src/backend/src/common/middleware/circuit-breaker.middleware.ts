/**
 * @fileoverview Advanced circuit breaker middleware for handling service failures gracefully
 * Implements configurable thresholds, detailed state tracking, and comprehensive monitoring
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.x
import CircuitBreaker from 'opossum'; // v6.x
import { Logger } from '../utils/logger.util';
import { SYSTEM_ERRORS } from '../constants/error-codes';

/**
 * Circuit breaker configuration options
 */
interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  requestTimeout?: number;
  serviceName: string;
  serviceVersion: string;
}

/**
 * Circuit breaker metrics interface
 */
interface CircuitMetrics {
  state: string;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime?: Date;
  averageResponseTime: number;
  percentiles: {
    p95: number;
    p99: number;
  };
}

/**
 * Implements an advanced circuit breaker pattern middleware with configurable thresholds,
 * detailed state tracking, and comprehensive monitoring capabilities
 */
export class CircuitBreakerMiddleware {
  private breaker: CircuitBreaker;
  private logger: Logger;
  private failureThreshold: number;
  private resetTimeout: number;
  private requestTimeout: number;
  private requestCounts: Map<string, number>;
  private metrics: CircuitMetrics;
  private responseTimings: number[];

  /**
   * Creates a new circuit breaker middleware instance
   * @param options - Configuration options for the circuit breaker
   */
  constructor(options: CircuitBreakerOptions) {
    this.logger = new Logger(
      { enabled: true, metricsPort: 9090, logLevel: 'info', tracing: { enabled: true, samplingRate: 1 }, alerting: { enabled: true, endpoints: [] } },
      options.serviceName,
      options.serviceVersion
    );

    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.requestTimeout = options.requestTimeout || 5000;
    this.requestCounts = new Map();
    this.responseTimings = [];

    // Initialize metrics
    this.metrics = {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      percentiles: { p95: 0, p99: 0 }
    };

    // Create circuit breaker instance
    this.breaker = new CircuitBreaker(this.executeRequest.bind(this), {
      timeout: this.requestTimeout,
      errorThresholdPercentage: (this.failureThreshold / 10) * 100,
      resetTimeout: this.resetTimeout,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Sets up circuit breaker event listeners for state changes and failures
   */
  private setupEventListeners(): void {
    this.breaker.on('open', () => {
      this.onStateChange('CLOSED', 'OPEN');
    });

    this.breaker.on('halfOpen', () => {
      this.onStateChange('OPEN', 'HALF-OPEN');
    });

    this.breaker.on('close', () => {
      this.onStateChange('HALF-OPEN', 'CLOSED');
    });

    this.breaker.on('success', () => {
      this.metrics.successes++;
      this.updateMetrics();
    });

    this.breaker.on('failure', (error: Error) => {
      this.metrics.failures++;
      this.metrics.lastFailureTime = new Date();
      this.logger.error('Circuit breaker failure', error, {
        metrics: this.metrics,
        circuitState: this.breaker.stats
      });
    });
  }

  /**
   * Handles state transitions and updates metrics
   * @param oldState - Previous circuit state
   * @param newState - New circuit state
   */
  private onStateChange(oldState: string, newState: string): void {
    this.metrics.state = newState;
    this.logger.info(`Circuit breaker state changed from ${oldState} to ${newState}`, {
      metrics: this.metrics,
      circuitStats: this.breaker.stats
    });
  }

  /**
   * Executes the request through the circuit breaker
   * @param req - Express request object
   * @param res - Express response object
   * @returns Promise resolving to the response
   */
  private async executeRequest(req: Request, res: Response): Promise<any> {
    const startTime = Date.now();
    
    try {
      const result = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Request timeout'));
        }, this.requestTimeout);

        res.on('finish', () => {
          clearTimeout(timeout);
          resolve(res);
        });

        res.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      const responseTime = Date.now() - startTime;
      this.responseTimings.push(responseTime);
      this.updateResponseTimeMetrics();
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Updates response time metrics including averages and percentiles
   */
  private updateResponseTimeMetrics(): void {
    if (this.responseTimings.length > 0) {
      const sortedTimings = [...this.responseTimings].sort((a, b) => a - b);
      const total = sortedTimings.reduce((sum, time) => sum + time, 0);
      
      this.metrics.averageResponseTime = total / sortedTimings.length;
      this.metrics.percentiles.p95 = sortedTimings[Math.floor(sortedTimings.length * 0.95)];
      this.metrics.percentiles.p99 = sortedTimings[Math.floor(sortedTimings.length * 0.99)];
      
      // Keep only last 1000 timings
      if (this.responseTimings.length > 1000) {
        this.responseTimings = this.responseTimings.slice(-1000);
      }
    }
  }

  /**
   * Updates overall circuit breaker metrics
   */
  private updateMetrics(): void {
    this.metrics.totalRequests = this.metrics.successes + this.metrics.failures;
  }

  /**
   * Express middleware function to handle requests through the circuit breaker
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  public async handleRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string || Date.now().toString();
    this.logger.setCorrelationId(correlationId);

    if (this.breaker.opened) {
      this.logger.warn('Circuit breaker is OPEN, rejecting request', {
        path: req.path,
        method: req.method,
        metrics: this.metrics
      });

      res.setHeader('Retry-After', Math.ceil(this.resetTimeout / 1000).toString());
      res.status(503).json({
        error: {
          code: SYSTEM_ERRORS.CIRCUIT_BREAKER_OPEN,
          message: 'Service temporarily unavailable'
        }
      });
      return;
    }

    try {
      await this.breaker.fire(req, res);
      next();
    } catch (error) {
      this.logger.error('Request failed', error as Error, {
        path: req.path,
        method: req.method,
        metrics: this.metrics
      });

      if (!res.headersSent) {
        res.status(500).json({
          error: {
            code: SYSTEM_ERRORS.INTERNAL_ERROR,
            message: 'Internal server error'
          }
        });
      }
    }
  }

  /**
   * Retrieves current circuit breaker metrics
   * @returns Current circuit breaker metrics and statistics
   */
  public getMetrics(): CircuitMetrics {
    return {
      ...this.metrics,
      ...this.breaker.stats
    };
  }
}