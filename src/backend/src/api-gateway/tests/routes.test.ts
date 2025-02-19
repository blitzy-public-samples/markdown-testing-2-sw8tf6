/**
 * API Gateway Routes Test Suite
 * Implements comprehensive testing of route configurations, middleware chains,
 * and request handling with performance validation
 * @version 1.0.0
 */

import express, { Express } from 'express'; // ^4.x
import supertest from 'supertest'; // ^6.x
import { configureRoutes } from '../config/routes.config';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { BaseValidator } from '../../common/validators/base.validator';
import { VALIDATION_ERRORS, AUTH_ERRORS } from '../../common/constants/error-codes';
import { CLIENT_ERROR_CODES } from '../../common/constants/status-codes';

let app: Express;
let request: supertest.SuperTest<supertest.Test>;

// Mock validator for testing
class TestValidator extends BaseValidator {
  constructor() {
    super(null as any, ['required_field']);
  }
}

describe('API Gateway Routes', () => {
  beforeAll(() => {
    // Initialize Express app and configure routes
    app = express();
    configureRoutes(app);
    request = supertest(app);
  });

  afterAll(async () => {
    // Cleanup resources
    await new Promise<void>((resolve) => {
      resolve();
    });
  });

  describe('Health Check Routes', () => {
    it('should respond to GET /health within 300ms', async () => {
      const startTime = Date.now();
      const response = await request.get('/health');
      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(responseTime).toBeLessThan(300);
    });

    it('should include required response headers', async () => {
      const response = await request.get('/health');

      expect(response.headers).toHaveProperty('content-type', expect.stringContaining('application/json'));
      expect(response.headers).toHaveProperty('x-request-id');
      expect(response.headers).toHaveProperty('x-correlation-id');
    });
  });

  describe('Authentication Routes', () => {
    const loginPayload = {
      email: 'test@example.com',
      password: 'Password123!'
    };

    it('should validate login request payload', async () => {
      const response = await request
        .post('/api/v1/auth/login')
        .send({});

      expect(response.status).toBe(CLIENT_ERROR_CODES.BAD_REQUEST);
      expect(response.body).toHaveProperty('code', VALIDATION_ERRORS.REQUIRED_FIELD);
    });

    it('should enforce rate limiting on auth routes', async () => {
      // Make multiple rapid requests
      const requests = Array(6).fill(null).map(() => 
        request
          .post('/api/v1/auth/login')
          .send(loginPayload)
      );

      const responses = await Promise.all(requests);
      const lastResponse = responses[responses.length - 1];

      expect(lastResponse.status).toBe(CLIENT_ERROR_CODES.TOO_MANY_REQUESTS);
    });

    it('should complete login request within 300ms', async () => {
      const startTime = Date.now();
      const response = await request
        .post('/api/v1/auth/login')
        .send(loginPayload);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(300);
    });
  });

  describe('Protected Routes', () => {
    const validToken = 'valid.jwt.token';
    const invalidToken = 'invalid.token';

    it('should reject requests without authentication', async () => {
      const response = await request.get('/api/v1/tasks');

      expect(response.status).toBe(CLIENT_ERROR_CODES.UNAUTHORIZED);
      expect(response.body).toHaveProperty('code', AUTH_ERRORS.TOKEN_MISSING);
    });

    it('should reject invalid tokens', async () => {
      const response = await request
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(CLIENT_ERROR_CODES.UNAUTHORIZED);
      expect(response.body).toHaveProperty('code', AUTH_ERRORS.TOKEN_INVALID);
    });

    it('should validate role-based access', async () => {
      const response = await request
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(CLIENT_ERROR_CODES.FORBIDDEN);
      expect(response.body).toHaveProperty('code', AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
    });

    it('should complete authorized requests within 300ms', async () => {
      const startTime = Date.now();
      const response = await request
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${validToken}`);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(300);
    });
  });

  describe('Request Validation', () => {
    const validator = new TestValidator();

    it('should validate request body', async () => {
      const response = await request
        .post('/api/v1/tasks')
        .send({})
        .set('Authorization', 'Bearer valid.token');

      expect(response.status).toBe(CLIENT_ERROR_CODES.BAD_REQUEST);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          field: 'required_field',
          code: VALIDATION_ERRORS.REQUIRED_FIELD
        })
      );
    });

    it('should handle validation timeouts', async () => {
      // Mock slow validation
      jest.spyOn(validator, 'validate').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 6000));
        return [];
      });

      const response = await request
        .post('/api/v1/tasks')
        .send({ data: 'test' })
        .set('Authorization', 'Bearer valid.token');

      expect(response.status).toBe(CLIENT_ERROR_CODES.BAD_REQUEST);
      expect(response.body).toHaveProperty('message', 'Validation timeout exceeded');
    });

    it('should enforce request size limits', async () => {
      const largeData = Buffer.alloc(11 * 1024 * 1024).toString();
      const response = await request
        .post('/api/v1/tasks')
        .send({ data: largeData })
        .set('Authorization', 'Bearer valid.token');

      expect(response.status).toBe(CLIENT_ERROR_CODES.BAD_REQUEST);
      expect(response.body).toHaveProperty('message', expect.stringContaining('Request size exceeds limit'));
    });
  });

  describe('Error Handling', () => {
    it('should return standardized error responses', async () => {
      const response = await request.get('/non-existent-path');

      expect(response.status).toBe(CLIENT_ERROR_CODES.NOT_FOUND);
      expect(response.body).toMatchObject({
        status: expect.any(Number),
        message: expect.any(String),
        code: expect.any(String),
        details: expect.any(Array),
        timestamp: expect.any(String),
        path: expect.any(String),
        correlationId: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should include performance metrics in error responses', async () => {
      const response = await request.get('/non-existent-path');

      expect(response.headers).toHaveProperty('x-error-time');
      expect(response.headers).toHaveProperty('x-total-time');
    });
  });
});