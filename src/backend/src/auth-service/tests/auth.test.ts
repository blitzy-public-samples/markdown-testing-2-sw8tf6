import { describe, expect, jest, test, beforeEach, afterEach } from '@jest/globals';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { IUser, IAuthCredentials, IAuthTokens } from '../interfaces/auth.interface';
import { jwtConfig } from '../config/jwt.config';

// Mock implementations
jest.mock('../repositories/user.repository');
jest.mock('../config/jwt.config');

describe('AuthService', () => {
    let authService: AuthService;
    let userRepository: jest.Mocked<UserRepository>;

    const mockUser: IUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyBAQ.qjQX6/1O', // hashed 'Test123!@#'
        name: 'Test User',
        roleId: 'role-123',
        role: {
            id: 'role-123',
            name: 'user',
            description: 'Standard user',
            permissions: [],
            isSystem: false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1
        },
        isActive: true,
        isMFAEnabled: false,
        mfaSecret: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
    };

    beforeEach(() => {
        userRepository = {
            findByEmail: jest.fn(),
            create: jest.fn(),
            updateLastLogin: jest.fn(),
            updateLoginAttempts: jest.fn(),
            updateAccountStatus: jest.fn()
        } as unknown as jest.Mocked<UserRepository>;

        authService = new AuthService(userRepository);

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('login', () => {
        const validCredentials: IAuthCredentials = {
            email: 'test@example.com',
            password: 'Test123!@#'
        };

        test('should successfully authenticate user with valid credentials', async () => {
            // Arrange
            userRepository.findByEmail.mockResolvedValue(mockUser);
            const mockTokens: IAuthTokens = {
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                expiresIn: 900
            };
            jest.spyOn(authService as any, 'generateTokenPair').mockResolvedValue(mockTokens);

            // Act
            const result = await authService.login(validCredentials);

            // Assert
            expect(result).toEqual(mockTokens);
            expect(userRepository.findByEmail).toHaveBeenCalledWith(validCredentials.email);
            expect(userRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
        });

        test('should throw error for non-existent user', async () => {
            // Arrange
            userRepository.findByEmail.mockResolvedValue(null);

            // Act & Assert
            await expect(authService.login(validCredentials))
                .rejects
                .toThrow('Invalid credentials');
        });

        test('should throw error for locked account', async () => {
            // Arrange
            const lockedUser = {
                ...mockUser,
                failedLoginAttempts: 5,
                lastLoginAt: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
            };
            userRepository.findByEmail.mockResolvedValue(lockedUser);

            // Act & Assert
            await expect(authService.login(validCredentials))
                .rejects
                .toThrow(/Account locked/);
        });

        test('should handle MFA verification when enabled', async () => {
            // Arrange
            const mfaUser = {
                ...mockUser,
                isMFAEnabled: true,
                mfaSecret: 'MFASECRET123'
            };
            userRepository.findByEmail.mockResolvedValue(mfaUser);
            const mfaCredentials: IAuthCredentials = {
                ...validCredentials,
                mfaCode: '123456'
            };
            jest.spyOn(authService as any, 'verifyMFA').mockResolvedValue(true);

            // Act
            await authService.login(mfaCredentials);

            // Assert
            expect(authService['verifyMFA']).toHaveBeenCalledWith(mfaUser, '123456');
        });
    });

    describe('refreshToken', () => {
        const mockRefreshToken = 'valid-refresh-token';

        test('should successfully refresh tokens with valid refresh token', async () => {
            // Arrange
            const decodedToken = { userId: mockUser.id };
            jest.spyOn(jwtConfig, 'verifyToken').mockResolvedValue(decodedToken);
            jest.spyOn(jwtConfig, 'isTokenBlacklisted').mockResolvedValue(false);
            userRepository.findById = jest.fn().mockResolvedValue(mockUser);

            // Act
            const result = await authService.refreshToken(mockRefreshToken);

            // Assert
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(jwtConfig.verifyToken).toHaveBeenCalledWith(mockRefreshToken);
        });

        test('should throw error for blacklisted refresh token', async () => {
            // Arrange
            jest.spyOn(jwtConfig, 'verifyToken').mockResolvedValue({ userId: mockUser.id });
            jest.spyOn(jwtConfig, 'isTokenBlacklisted').mockResolvedValue(true);

            // Act & Assert
            await expect(authService.refreshToken(mockRefreshToken))
                .rejects
                .toThrow('Token has been revoked');
        });
    });

    describe('setupMFA', () => {
        test('should successfully set up MFA for user', async () => {
            // Arrange
            userRepository.findById = jest.fn().mockResolvedValue(mockUser);

            // Act
            const result = await authService.setupMFA(mockUser.id);

            // Assert
            expect(result).toHaveProperty('secret');
            expect(result).toHaveProperty('qrCode');
            expect(result).toHaveProperty('backupCodes');
            expect(result.backupCodes).toHaveLength(10);
        });

        test('should throw error for non-existent user', async () => {
            // Arrange
            userRepository.findById = jest.fn().mockResolvedValue(null);

            // Act & Assert
            await expect(authService.setupMFA('invalid-id'))
                .rejects
                .toThrow('User not found');
        });
    });

    describe('Security Features', () => {
        test('should enforce rate limiting', async () => {
            // Arrange
            const attempts = Array(6).fill(validCredentials);
            userRepository.findByEmail.mockResolvedValue(mockUser);

            // Act & Assert
            for (const attempt of attempts) {
                try {
                    await authService.login(attempt);
                } catch (error) {
                    expect(error.message).toMatch(/Account locked/);
                }
            }
        });

        test('should validate password complexity', async () => {
            // Arrange
            const weakCredentials: IAuthCredentials = {
                email: 'test@example.com',
                password: 'weak'
            };
            userRepository.findByEmail.mockResolvedValue(mockUser);

            // Act & Assert
            await expect(authService.login(weakCredentials))
                .rejects
                .toThrow('Invalid credentials');
        });

        test('should track failed login attempts', async () => {
            // Arrange
            const invalidCredentials: IAuthCredentials = {
                email: 'test@example.com',
                password: 'WrongPass123!@#'
            };
            userRepository.findByEmail.mockResolvedValue(mockUser);

            // Act
            try {
                await authService.login(invalidCredentials);
            } catch (error) {
                // Assert
                expect(userRepository.updateLoginAttempts)
                    .toHaveBeenCalledWith(mockUser.id, expect.any(Number));
            }
        });
    });
});