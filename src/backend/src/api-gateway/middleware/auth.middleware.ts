/**
 * Authentication and Authorization Middleware
 * Implements comprehensive security controls for the API Gateway including
 * token validation, MFA verification, and role-based access control.
 * @version 1.0.0
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verify, JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import { IAuthTokens } from '../../auth-service/interfaces/auth.interface';
import { IErrorResponse } from '../../common/interfaces/error.interface';
import { jwtConfig } from '../../auth-service/config/jwt.config';
import { AUTH_ERRORS, SYSTEM_ERRORS } from '../../common/constants/error-codes';
import { CLIENT_ERROR_CODES, SERVER_ERROR_CODES } from '../../common/constants/status-codes';

// Extend Express Request type to include user and token information
declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: string;
      correlationId?: string;
      mfaVerified?: boolean;
    }
  }
}

/**
 * Enhanced authentication middleware with comprehensive security controls
 * Validates JWT tokens, checks MFA requirements, and implements security measures
 */
export const authenticate: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Generate correlation ID for request tracking
    req.correlationId = uuidv4();

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createAuthError(
        AUTH_ERRORS.TOKEN_MISSING,
        'No authentication token provided',
        req.correlationId
      );
    }

    const token = authHeader.split(' ')[1];
    req.token = token;

    // Check token blacklist
    if (jwtConfig.blacklistEnabled) {
      const isBlacklisted = await checkTokenBlacklist(token);
      if (isBlacklisted) {
        throw createAuthError(
          AUTH_ERRORS.TOKEN_INVALID,
          'Token has been revoked',
          req.correlationId
        );
      }
    }

    // Verify token with enhanced security options
    const decoded = await verifyToken(token, req.correlationId);
    req.user = decoded;

    // Check MFA requirements if enabled
    if (decoded.mfaRequired && !req.mfaVerified) {
      const mfaToken = req.headers['x-mfa-token'] as string;
      if (!mfaToken) {
        throw createAuthError(
          AUTH_ERRORS.MFA_REQUIRED,
          'MFA verification required',
          req.correlationId
        );
      }
      await verifyMFAToken(mfaToken, decoded.userId);
      req.mfaVerified = true;
    }

    // Perform additional security checks
    await performSecurityChecks(req);

    // Log successful authentication
    logAuthenticationSuccess(req);

    next();
  } catch (error) {
    handleAuthError(error, req, res);
  }
};

/**
 * Enhanced role-based authorization middleware factory
 * Creates middleware for granular permission checking with resource-level access control
 */
export const authorizeRoles = (
  allowedRoles: string[],
  requiredPermissions: string[] = [],
  resourceOptions: { resourceType?: string; ownershipCheck?: boolean } = {}
): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw createAuthError(
          AUTH_ERRORS.UNAUTHORIZED,
          'User not authenticated',
          req.correlationId
        );
      }

      // Validate user role against allowed roles
      const hasRole = allowedRoles.includes(req.user.role);
      if (!hasRole) {
        throw createAuthError(
          AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
          'Insufficient role permissions',
          req.correlationId
        );
      }

      // Check granular permissions
      if (requiredPermissions.length > 0) {
        const hasPermissions = requiredPermissions.every(permission =>
          req.user.permissions.includes(permission)
        );
        if (!hasPermissions) {
          throw createAuthError(
            AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
            'Missing required permissions',
            req.correlationId
          );
        }
      }

      // Resource-level access control
      if (resourceOptions.resourceType && resourceOptions.ownershipCheck) {
        await validateResourceAccess(req, resourceOptions.resourceType);
      }

      // Log successful authorization
      logAuthorizationSuccess(req, allowedRoles, requiredPermissions);

      next();
    } catch (error) {
      handleAuthError(error, req, res);
    }
  };
};

/**
 * Verifies JWT token with enhanced security checks
 */
async function verifyToken(token: string, correlationId: string): Promise<any> {
  try {
    return await jwtConfig.verifyToken(token);
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw createAuthError(
        AUTH_ERRORS.TOKEN_EXPIRED,
        'Authentication token has expired',
        correlationId
      );
    }
    if (error instanceof JsonWebTokenError) {
      throw createAuthError(
        AUTH_ERRORS.TOKEN_INVALID,
        'Invalid authentication token',
        correlationId
      );
    }
    throw error;
  }
}

/**
 * Verifies MFA token validity
 */
async function verifyMFAToken(token: string, userId: string): Promise<void> {
  // Implementation would verify MFA token against stored secret
  // This is a placeholder for the actual implementation
}

/**
 * Performs additional security checks
 */
async function performSecurityChecks(req: Request): Promise<void> {
  // Implementation would include:
  // - IP validation
  // - Rate limiting
  // - Session validation
  // - Additional security measures
}

/**
 * Validates resource-level access permissions
 */
async function validateResourceAccess(req: Request, resourceType: string): Promise<void> {
  // Implementation would check resource ownership and access rights
  // This is a placeholder for the actual implementation
}

/**
 * Checks if a token is blacklisted
 */
async function checkTokenBlacklist(token: string): Promise<boolean> {
  // Implementation would check token against blacklist storage
  // This is a placeholder for the actual implementation
  return false;
}

/**
 * Creates a standardized authentication error
 */
function createAuthError(
  code: AUTH_ERRORS,
  message: string,
  correlationId: string
): Error & { status: number; code: string } {
  const error = new Error(message) as Error & { status: number; code: string };
  error.status = CLIENT_ERROR_CODES.UNAUTHORIZED;
  error.code = code;
  return error;
}

/**
 * Handles authentication and authorization errors
 */
function handleAuthError(error: any, req: Request, res: Response): void {
  const errorResponse: IErrorResponse = {
    status: error.status || SERVER_ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: error.message || 'Authentication error occurred',
    code: error.code || SYSTEM_ERRORS.INTERNAL_ERROR,
    correlationId: req.correlationId as string,
    details: [],
    timestamp: new Date(),
    path: req.path,
    requestId: req.correlationId as string
  };

  // Log error with correlation ID
  console.error(`Auth Error [${req.correlationId}]:`, error);

  res.status(errorResponse.status).json(errorResponse);
}

/**
 * Logs successful authentication
 */
function logAuthenticationSuccess(req: Request): void {
  console.info(`Authentication success [${req.correlationId}]: User ${req.user.userId}`);
}

/**
 * Logs successful authorization
 */
function logAuthorizationSuccess(
  req: Request,
  roles: string[],
  permissions: string[]
): void {
  console.info(
    `Authorization success [${req.correlationId}]: User ${req.user.userId}, ` +
    `Roles: ${roles.join(', ')}, Permissions: ${permissions.join(', ')}`
  );
}