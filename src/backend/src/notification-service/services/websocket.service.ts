/**
 * @fileoverview WebSocket service for real-time notification delivery
 * Provides secure, scalable WebSocket connections with health monitoring
 * @version 1.0.0
 */

import { Server, Socket } from 'socket.io'; // ^4.7.2
import { verify } from 'jsonwebtoken'; // ^9.0.2
import { IWebSocketConfig } from '../config/websocket.config';
import { Logger } from '../../common/utils/logger.util';
import { INotification, NotificationPriority } from '../interfaces/notification.interface';
import { AUTH_ERRORS, SYSTEM_ERRORS } from '../../common/constants/error-codes';

interface ConnectionStats {
  connectedAt: Date;
  messageCount: number;
  lastPingTime: Date;
  userId: string;
}

/**
 * WebSocket service for managing real-time notification delivery
 * with comprehensive connection management and monitoring
 */
export class WebSocketService {
  private io: Server;
  private readonly userConnections: Map<string, Set<string>>;
  private readonly connectionStats: Map<string, ConnectionStats>;
  private readonly maxConnections: number;
  private readonly pingInterval: number;
  private readonly logger: Logger;

  /**
   * Initializes the WebSocket service with security and monitoring
   * @param config - WebSocket configuration settings
   * @param logger - Logger instance for service monitoring
   */
  constructor(config: IWebSocketConfig, logger: Logger) {
    this.logger = logger;
    this.maxConnections = config.maxConnections;
    this.pingInterval = config.pingInterval;
    this.userConnections = new Map();
    this.connectionStats = new Map();

    // Initialize Socket.IO server with security settings
    this.io = new Server({
      path: config.path,
      cors: config.cors,
      pingInterval: this.pingInterval,
      pingTimeout: config.pingTimeout,
      transports: ['websocket'],
      maxHttpBufferSize: 1e6, // 1MB
    });

    // Set up error handlers
    this.io.on('error', (error: Error) => {
      this.logger.error('WebSocket server error', error, {
        code: SYSTEM_ERRORS.INTERNAL_ERROR,
      });
    });
  }

  /**
   * Starts the WebSocket server with health monitoring
   */
  public async start(): Promise<void> {
    try {
      // Set up connection handling
      this.io.on('connection', this.handleConnection.bind(this));

      // Start health monitoring
      setInterval(this.checkConnectionHealth.bind(this), this.pingInterval);

      this.logger.info('WebSocket server started', {
        maxConnections: this.maxConnections,
        pingInterval: this.pingInterval,
      });
    } catch (error) {
      this.logger.error('Failed to start WebSocket server', error as Error, {
        code: SYSTEM_ERRORS.SERVICE_UNAVAILABLE,
      });
      throw error;
    }
  }

  /**
   * Handles new WebSocket connections with authentication
   * @param socket - Socket instance for the new connection
   */
  private handleConnection(socket: Socket): void {
    try {
      // Validate JWT token
      const token = socket.handshake.auth.token;
      if (!token) {
        this.logger.warn('Connection attempt without token', {
          code: AUTH_ERRORS.TOKEN_MISSING,
        });
        socket.disconnect(true);
        return;
      }

      // Verify token and extract user ID
      const decoded = verify(token, process.env.JWT_SECRET!) as { userId: string };
      const userId = decoded.userId;

      // Check connection limits
      if (this.getTotalConnections() >= this.maxConnections) {
        this.logger.warn('Connection limit exceeded', {
          code: SYSTEM_ERRORS.RATE_LIMIT_EXCEEDED,
        });
        socket.disconnect(true);
        return;
      }

      // Track connection
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(socket.id);

      // Initialize connection stats
      this.connectionStats.set(socket.id, {
        connectedAt: new Date(),
        messageCount: 0,
        lastPingTime: new Date(),
        userId,
      });

      // Set up disconnect handler
      socket.on('disconnect', () => this.handleDisconnect(userId, socket.id));

      // Set up ping handler
      socket.on('ping', () => this.updatePingTime(socket.id));

      this.logger.info('Client connected', {
        userId,
        socketId: socket.id,
      });
    } catch (error) {
      this.logger.error('Connection handling error', error as Error, {
        code: AUTH_ERRORS.TOKEN_INVALID,
      });
      socket.disconnect(true);
    }
  }

  /**
   * Handles client disconnections with cleanup
   * @param userId - User ID of the disconnected client
   * @param socketId - Socket ID of the disconnected connection
   */
  private handleDisconnect(userId: string, socketId: string): void {
    try {
      // Remove socket from tracking
      this.userConnections.get(userId)?.delete(socketId);
      if (this.userConnections.get(userId)?.size === 0) {
        this.userConnections.delete(userId);
      }
      this.connectionStats.delete(socketId);

      this.logger.info('Client disconnected', {
        userId,
        socketId,
      });
    } catch (error) {
      this.logger.error('Disconnect handling error', error as Error, {
        userId,
        socketId,
      });
    }
  }

  /**
   * Broadcasts a notification to specified users with delivery confirmation
   * @param notification - Notification to broadcast
   */
  public async broadcastNotification(notification: INotification): Promise<void> {
    try {
      const userSockets = this.userConnections.get(notification.userId);
      if (!userSockets || userSockets.size === 0) {
        this.logger.warn('User not connected', {
          userId: notification.userId,
          notificationType: notification.type,
        });
        return;
      }

      // Apply priority-based handling
      const timeout = this.getTimeoutByPriority(notification.priority);
      const deliveryPromises = Array.from(userSockets).map(socketId =>
        this.sendWithConfirmation(socketId, notification, timeout)
      );

      await Promise.all(deliveryPromises);

      this.logger.info('Notification broadcast complete', {
        userId: notification.userId,
        notificationType: notification.type,
        recipientCount: userSockets.size,
      });
    } catch (error) {
      this.logger.error('Broadcast error', error as Error, {
        notification,
        code: SYSTEM_ERRORS.NETWORK_ERROR,
      });
      throw error;
    }
  }

  /**
   * Sends notification with delivery confirmation
   * @param socketId - Target socket ID
   * @param notification - Notification to send
   * @param timeout - Delivery timeout
   */
  private async sendWithConfirmation(
    socketId: Socket['id'],
    notification: INotification,
    timeout: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (!socket) {
        reject(new Error('Socket not found'));
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error('Delivery confirmation timeout'));
      }, timeout);

      socket.emit('notification', notification, () => {
        clearTimeout(timer);
        this.updateMessageCount(socketId);
        resolve();
      });
    });
  }

  /**
   * Updates connection health monitoring data
   * @param socketId - Socket ID to update
   */
  private updatePingTime(socketId: string): void {
    const stats = this.connectionStats.get(socketId);
    if (stats) {
      stats.lastPingTime = new Date();
    }
  }

  /**
   * Updates message count for connection statistics
   * @param socketId - Socket ID to update
   */
  private updateMessageCount(socketId: string): void {
    const stats = this.connectionStats.get(socketId);
    if (stats) {
      stats.messageCount++;
    }
  }

  /**
   * Monitors connection health and removes stale connections
   */
  private checkConnectionHealth(): void {
    const now = new Date();
    for (const [socketId, stats] of this.connectionStats.entries()) {
      const timeSinceLastPing = now.getTime() - stats.lastPingTime.getTime();
      if (timeSinceLastPing > this.pingInterval * 2) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          this.logger.warn('Closing stale connection', {
            socketId,
            userId: stats.userId,
            timeSinceLastPing,
          });
          socket.disconnect(true);
        }
      }
    }
  }

  /**
   * Gets timeout duration based on notification priority
   * @param priority - Notification priority level
   */
  private getTimeoutByPriority(priority: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.HIGH:
        return 5000; // 5 seconds
      case NotificationPriority.MEDIUM:
        return 10000; // 10 seconds
      case NotificationPriority.LOW:
        return 15000; // 15 seconds
      default:
        return 10000;
    }
  }

  /**
   * Gets total number of active connections
   */
  private getTotalConnections(): number {
    return Array.from(this.userConnections.values())
      .reduce((total, sockets) => total + sockets.size, 0);
  }

  /**
   * Gets current connection statistics
   */
  public getConnectionStats(): Record<string, any> {
    return {
      totalConnections: this.getTotalConnections(),
      uniqueUsers: this.userConnections.size,
      connectionStats: Array.from(this.connectionStats.entries()).map(([socketId, stats]) => ({
        socketId,
        ...stats,
        uptime: new Date().getTime() - stats.connectedAt.getTime(),
      })),
    };
  }
}