/**
 * API Gateway Route Configuration
 * Implements high-performance, secure routing with comprehensive middleware chains
 * @version 1.0.0
 */

import express, { Express, Router } from 'express';
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import rateLimit from 'express-rate-limit'; // ^6.9.0
import compression from 'compression'; // ^1.7.4

import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.middleware';
import errorHandler from '../middleware/error.middleware';

// API version and base path
const API_VERSION = '/api/v1';
const ALLOWED_ROLES = ['admin', 'manager', 'user'];
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

/**
 * Configures all API routes with optimized middleware chains
 * @param app Express application instance
 */
export default function configureRoutes(app: Express): void {
  // Apply security middleware
  app.use(helmet({
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: true,
    xssFilter: true
  }));

  // Configure CORS
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-correlation-id'],
    exposedHeaders: ['x-request-id', 'x-correlation-id'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));

  // Enable compression
  app.use(compression());

  // Configure global rate limiting
  app.use(rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.'
  }));

  // Parse JSON and URL-encoded bodies
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check route
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use(API_VERSION, setupAuthRoutes());
  app.use(API_VERSION, setupTaskRoutes());
  app.use(API_VERSION, setupProjectRoutes());
  app.use(API_VERSION, setupNotificationRoutes());
  app.use(API_VERSION, setupFileRoutes());

  // Error handling middleware
  app.use(errorHandler);
}

/**
 * Configures authentication routes
 */
function setupAuthRoutes(): Router {
  const router = Router();

  // Strict rate limiting for auth routes
  const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Too many login attempts, please try again later.'
  });

  router.post('/auth/login', 
    authRateLimit,
    validateBody('loginSchema'),
    (req, res) => {
      // Login route handler
  });

  router.post('/auth/register',
    validateBody('registrationSchema'),
    (req, res) => {
      // Registration route handler
  });

  router.post('/auth/refresh-token',
    validateBody('refreshTokenSchema'),
    (req, res) => {
      // Token refresh route handler
  });

  return router;
}

/**
 * Configures task management routes
 */
function setupTaskRoutes(): Router {
  const router = Router();

  router.use('/tasks', authenticateToken);

  router.get('/tasks',
    authorizeRoles(ALLOWED_ROLES),
    validateQuery('taskQuerySchema'),
    (req, res) => {
      // List tasks route handler
  });

  router.post('/tasks',
    authorizeRoles(['admin', 'manager']),
    validateBody('taskCreateSchema'),
    (req, res) => {
      // Create task route handler
  });

  router.put('/tasks/:id',
    authorizeRoles(ALLOWED_ROLES),
    validateParams('taskIdSchema'),
    validateBody('taskUpdateSchema'),
    (req, res) => {
      // Update task route handler
  });

  return router;
}

/**
 * Configures project management routes
 */
function setupProjectRoutes(): Router {
  const router = Router();

  router.use('/projects', authenticateToken);

  router.get('/projects',
    authorizeRoles(ALLOWED_ROLES),
    validateQuery('projectQuerySchema'),
    (req, res) => {
      // List projects route handler
  });

  router.post('/projects',
    authorizeRoles(['admin', 'manager']),
    validateBody('projectCreateSchema'),
    (req, res) => {
      // Create project route handler
  });

  router.put('/projects/:id',
    authorizeRoles(['admin', 'manager']),
    validateParams('projectIdSchema'),
    validateBody('projectUpdateSchema'),
    (req, res) => {
      // Update project route handler
  });

  return router;
}

/**
 * Configures notification routes
 */
function setupNotificationRoutes(): Router {
  const router = Router();

  router.use('/notifications', authenticateToken);

  router.get('/notifications',
    authorizeRoles(ALLOWED_ROLES),
    validateQuery('notificationQuerySchema'),
    (req, res) => {
      // List notifications route handler
  });

  router.patch('/notifications/:id/read',
    authorizeRoles(ALLOWED_ROLES),
    validateParams('notificationIdSchema'),
    (req, res) => {
      // Mark notification as read route handler
  });

  return router;
}

/**
 * Configures file management routes
 */
function setupFileRoutes(): Router {
  const router = Router();

  router.use('/files', authenticateToken);

  router.post('/files/upload',
    authorizeRoles(ALLOWED_ROLES),
    validateBody('fileUploadSchema'),
    (req, res) => {
      // File upload route handler
  });

  router.get('/files/:id',
    authorizeRoles(ALLOWED_ROLES),
    validateParams('fileIdSchema'),
    (req, res) => {
      // File download route handler
  });

  return router;
}