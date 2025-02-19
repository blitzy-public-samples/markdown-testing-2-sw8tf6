/**
 * @fileoverview Enhanced user repository with comprehensive security features
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client'; // v5.0.0
import { UserModel, hashPassword, validatePassword, generateMFASecret, verifyMFAToken } from '../models/user.model';
import { IUser, IUserCreateDTO } from '../interfaces/auth.interface';

/**
 * Repository class for handling user data persistence with enhanced security features
 * Implements comprehensive audit logging and version tracking
 */
export class UserRepository {
    private readonly MAX_LOGIN_ATTEMPTS = 5;
    private readonly LOCKOUT_DURATION_MINUTES = 30;

    constructor(
        private readonly prisma: PrismaClient
    ) {
        // Configure connection pool
        this.prisma.$connect().catch(error => {
            console.error('Database connection error:', error);
            process.exit(1);
        });
    }

    /**
     * Retrieves a user by ID with security metadata
     * @param id User's unique identifier
     * @returns Promise resolving to user entity with security metadata
     */
    async findById(id: string): Promise<IUser | null> {
        try {
            const user = await this.prisma.$transaction(async (tx) => {
                const result = await tx.user.findUnique({
                    where: { id },
                    include: {
                        role: true,
                        securityMetadata: true,
                        auditLogs: {
                            orderBy: { createdAt: 'desc' },
                            take: 1
                        }
                    }
                });

                if (result) {
                    // Log access for audit trail
                    await tx.userAuditLog.create({
                        data: {
                            userId: id,
                            action: 'READ',
                            metadata: {
                                timestamp: new Date().toISOString(),
                                accessType: 'REPOSITORY_LOOKUP'
                            }
                        }
                    });
                }

                return result;
            });

            return user;
        } catch (error) {
            console.error('Error in findById:', error);
            throw new Error('Failed to retrieve user');
        }
    }

    /**
     * Creates a new user with security features and audit trail
     * @param userData User creation data transfer object
     * @returns Promise resolving to created user entity
     */
    async create(userData: IUserCreateDTO): Promise<IUser> {
        try {
            const user = await this.prisma.$transaction(async (tx) => {
                // Check for existing user
                const existingUser = await tx.user.findUnique({
                    where: { email: userData.email }
                });

                if (existingUser) {
                    throw new Error('User already exists');
                }

                // Hash password with security features
                const hashedPassword = await hashPassword(userData.password);

                // Generate MFA secret
                const mfaSecret = await generateMFASecret();

                // Create user with security metadata
                const newUser = await tx.user.create({
                    data: {
                        email: userData.email,
                        password: hashedPassword,
                        name: userData.name,
                        roleId: userData.roleId,
                        version: 1,
                        securityMetadata: {
                            create: {
                                failedLoginAttempts: 0,
                                passwordHistory: [hashedPassword],
                                passwordLastChanged: new Date(),
                                mfaSecret,
                                isMFAEnabled: false
                            }
                        }
                    },
                    include: {
                        role: true,
                        securityMetadata: true
                    }
                });

                // Create audit log entry
                await tx.userAuditLog.create({
                    data: {
                        userId: newUser.id,
                        action: 'CREATE',
                        metadata: {
                            timestamp: new Date().toISOString(),
                            initialRole: userData.roleId
                        }
                    }
                });

                return newUser;
            });

            return user;
        } catch (error) {
            console.error('Error in create:', error);
            throw new Error('Failed to create user');
        }
    }

    /**
     * Updates user login attempts and manages account lockout
     * @param id User's unique identifier
     * @param success Whether login attempt was successful
     */
    async updateLoginAttempts(id: string, success: boolean): Promise<void> {
        try {
            await this.prisma.$transaction(async (tx) => {
                const user = await tx.user.findUnique({
                    where: { id },
                    include: { securityMetadata: true }
                });

                if (!user) {
                    throw new Error('User not found');
                }

                if (success) {
                    // Reset counters on successful login
                    await tx.userSecurityMetadata.update({
                        where: { userId: id },
                        data: {
                            failedLoginAttempts: 0,
                            lastLoginAt: new Date(),
                            lockoutUntil: null
                        }
                    });
                } else {
                    // Increment failed attempts and check for lockout
                    const failedAttempts = (user.securityMetadata?.failedLoginAttempts || 0) + 1;
                    const shouldLockout = failedAttempts >= this.MAX_LOGIN_ATTEMPTS;

                    await tx.userSecurityMetadata.update({
                        where: { userId: id },
                        data: {
                            failedLoginAttempts: failedAttempts,
                            lastFailedLoginAt: new Date(),
                            lockoutUntil: shouldLockout
                                ? new Date(Date.now() + this.LOCKOUT_DURATION_MINUTES * 60000)
                                : null
                        }
                    });
                }

                // Log security event
                await tx.userAuditLog.create({
                    data: {
                        userId: id,
                        action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
                        metadata: {
                            timestamp: new Date().toISOString(),
                            attemptResult: success ? 'SUCCESS' : 'FAILURE'
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Error in updateLoginAttempts:', error);
            throw new Error('Failed to update login attempts');
        }
    }
}