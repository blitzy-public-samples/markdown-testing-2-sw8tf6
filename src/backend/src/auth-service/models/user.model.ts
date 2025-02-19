/**
 * @fileoverview Enhanced user model with comprehensive security features
 * @version 1.0.0
 */

import { Model } from '@prisma/client'; // v5.0.0
import { hash, compare } from 'bcryptjs'; // v2.4.3
import { authenticator } from 'otplib'; // v12.0.1
import { IUser } from '../interfaces/auth.interface';
import { IRole } from '../interfaces/role.interface';
import { generateSecureRandomString } from '../utils/crypto.utils';

@Model
export class UserModel implements IUser {
    id: string;
    email: string;
    password: string;
    name: string;
    roleId: string;
    role: IRole;
    isActive: boolean;
    isMFAEnabled: boolean;
    mfaSecret: string | null;
    mfaBackupCodes: string[];
    passwordLastChanged: Date;
    passwordHistory: string[];
    failedLoginAttempts: number;
    lastFailedLoginAt: Date | null;
    lockoutUntil: Date | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    version: number;

    private static readonly PASSWORD_HISTORY_LIMIT = 5;
    private static readonly MAX_LOGIN_ATTEMPTS = 5;
    private static readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
    private static readonly BACKUP_CODES_COUNT = 10;
    private static readonly BACKUP_CODE_LENGTH = 10;

    /**
     * Validates and hashes a new password with enhanced security checks
     * @param password Plain text password to hash
     * @returns Promise resolving to the hashed password
     * @throws Error if password doesn't meet complexity requirements
     */
    async hashPassword(password: string): Promise<string> {
        // Validate password complexity
        const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{12,}$/;
        if (!complexityRegex.test(password)) {
            throw new Error('Password must be at least 12 characters long and contain uppercase, lowercase, numbers, and special characters');
        }

        // Check password history to prevent reuse
        if (this.passwordHistory?.length > 0) {
            for (const historicPassword of this.passwordHistory) {
                if (await compare(password, historicPassword)) {
                    throw new Error('Password has been used recently. Please choose a different password');
                }
            }
        }

        // Generate hash with high cost factor
        const hashedPassword = await hash(password, 12);

        // Update password history
        this.passwordHistory = [
            hashedPassword,
            ...(this.passwordHistory || []).slice(0, this.PASSWORD_HISTORY_LIMIT - 1)
        ];
        this.passwordLastChanged = new Date();

        return hashedPassword;
    }

    /**
     * Validates a password with account lockout protection
     * @param password Plain text password to validate
     * @returns Promise resolving to validation result
     */
    async validatePassword(password: string): Promise<boolean> {
        // Check account lockout
        if (this.lockoutUntil && this.lockoutUntil > new Date()) {
            throw new Error(`Account locked. Try again after ${this.lockoutUntil.toISOString()}`);
        }

        const isValid = await compare(password, this.password);

        if (!isValid) {
            this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;
            this.lastFailedLoginAt = new Date();

            if (this.failedLoginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
                this.lockoutUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
                throw new Error(`Account locked due to too many failed attempts. Try again after ${this.lockoutUntil.toISOString()}`);
            }
        } else {
            // Reset failed attempts on successful login
            this.failedLoginAttempts = 0;
            this.lastFailedLoginAt = null;
            this.lockoutUntil = null;
            this.lastLoginAt = new Date();
        }

        return isValid;
    }

    /**
     * Sets up MFA with TOTP and backup codes
     * @returns Promise resolving to MFA configuration
     */
    async setupMFA(): Promise<{ secret: string; backupCodes: string[] }> {
        // Generate TOTP secret
        const secret = authenticator.generateSecret();
        
        // Generate backup codes
        const backupCodes = Array.from({ length: this.BACKUP_CODES_COUNT }, () =>
            generateSecureRandomString(this.BACKUP_CODE_LENGTH)
        );

        // Update model
        this.mfaSecret = secret;
        this.mfaBackupCodes = backupCodes;
        this.isMFAEnabled = true;

        return {
            secret,
            backupCodes
        };
    }

    /**
     * Verifies MFA token or backup code
     * @param token TOTP token or backup code
     * @returns Promise resolving to verification result
     */
    async verifyMFA(token: string): Promise<boolean> {
        if (!this.isMFAEnabled || !this.mfaSecret) {
            throw new Error('MFA is not enabled for this user');
        }

        // Try TOTP verification first
        const isValidTOTP = authenticator.verify({
            token,
            secret: this.mfaSecret
        });

        if (isValidTOTP) {
            return true;
        }

        // Check backup codes if TOTP fails
        const backupCodeIndex = this.mfaBackupCodes.indexOf(token);
        if (backupCodeIndex !== -1) {
            // Remove used backup code
            this.mfaBackupCodes = this.mfaBackupCodes.filter((_, index) => index !== backupCodeIndex);
            return true;
        }

        return false;
    }
}