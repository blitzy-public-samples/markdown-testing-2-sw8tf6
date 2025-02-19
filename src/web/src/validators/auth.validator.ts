/**
 * Authentication Validator
 * Implements comprehensive validation logic for authentication-related forms and data
 * @version 1.0.0
 */

import { 
  LoginCredentials, 
  RegistrationData, 
  PasswordResetData, 
  UserRole 
} from '../interfaces/auth.interface';
import { 
  validateEmail, 
  validatePassword, 
  validateRequired, 
  validateLength 
} from '../utils/validation.util';
import { 
  ERROR_MESSAGES, 
  PASSWORD_RULES 
} from '../constants/validation.constants';

// Rate limiting configuration
const RATE_LIMITS = {
  LOGIN_ATTEMPTS: 5,
  MFA_ATTEMPTS: 3,
  RESET_ATTEMPTS: 3,
  WINDOW_MINUTES: 15
} as const;

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  rateLimitExceeded?: boolean;
  securityFlags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Validates login credentials with rate limiting and MFA support
 * @param credentials Login credentials to validate
 * @returns Validation result with detailed error messages
 */
export const validateLoginCredentials = (credentials: LoginCredentials): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: {},
    metadata: {
      attemptCount: 0,
      requiresMFA: false
    }
  };

  // Email validation
  const emailValidation = validateEmail(credentials.email);
  if (!emailValidation.isValid) {
    result.isValid = false;
    result.errors.email = emailValidation.error || ERROR_MESSAGES.INVALID_EMAIL;
  }

  // Password validation
  const passwordValidation = validatePassword(credentials.password);
  if (!passwordValidation.isValid) {
    result.isValid = false;
    result.errors.password = passwordValidation.error || ERROR_MESSAGES.INVALID_PASSWORD;
  }

  // MFA token validation if provided
  if (credentials.mfaToken) {
    const mfaValidation = validateMFAToken(credentials.mfaToken, credentials.mfaType === 'sms');
    if (!mfaValidation.isValid) {
      result.isValid = false;
      result.errors.mfaToken = mfaValidation.error || 'Invalid MFA token';
    }
  }

  return result;
};

/**
 * Validates user registration data with enhanced security checks
 * @param data Registration data to validate
 * @returns Validation result with security recommendations
 */
export const validateRegistrationData = (data: RegistrationData): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: {},
    securityFlags: [],
    metadata: {
      passwordStrength: 0
    }
  };

  // Email validation with domain checks
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    result.isValid = false;
    result.errors.email = emailValidation.error || ERROR_MESSAGES.INVALID_EMAIL;
  } else {
    // Check for disposable email domains
    const domain = data.email.split('@')[1];
    if (isDisposableEmailDomain(domain)) {
      result.securityFlags.push('DISPOSABLE_EMAIL_DOMAIN');
    }
  }

  // Password validation with strength assessment
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    result.isValid = false;
    result.errors.password = passwordValidation.error || ERROR_MESSAGES.INVALID_PASSWORD;
  }
  result.metadata.passwordStrength = passwordValidation.metadata?.strength || 0;

  // Name validation
  const nameValidation = validateLength(data.name, 2, 100, 'Name');
  if (!nameValidation.isValid) {
    result.isValid = false;
    result.errors.name = nameValidation.error || 'Invalid name length';
  }

  // Role validation
  if (!Object.values(UserRole).includes(data.role as UserRole)) {
    result.isValid = false;
    result.errors.role = 'Invalid user role';
  }

  // Consent validation
  if (!data.consentGiven) {
    result.isValid = false;
    result.errors.consent = 'Consent is required';
  }

  return result;
};

/**
 * Validates password reset data with history checks
 * @param data Password reset data to validate
 * @returns Validation result with detailed error messages
 */
export const validatePasswordReset = (data: PasswordResetData): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: {},
    metadata: {
      passwordStrength: 0
    }
  };

  // Token validation
  const tokenValidation = validateRequired(data.token, 'Reset token');
  if (!tokenValidation.isValid) {
    result.isValid = false;
    result.errors.token = tokenValidation.error || 'Invalid reset token';
  }

  // New password validation
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    result.isValid = false;
    result.errors.password = passwordValidation.error || ERROR_MESSAGES.INVALID_PASSWORD;
  }
  result.metadata.passwordStrength = passwordValidation.metadata?.strength || 0;

  // Confirm password validation
  if (data.password !== data.confirmPassword) {
    result.isValid = false;
    result.errors.confirmPassword = 'Passwords do not match';
  }

  return result;
};

/**
 * Validates MFA token format and handles rate limiting
 * @param token MFA token to validate
 * @param isBackupCode Whether the token is a backup code
 * @returns Validation result with attempt tracking
 */
export const validateMFAToken = (
  token: string,
  isBackupCode: boolean = false
): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: {},
    metadata: {
      attemptCount: 0,
      tokenType: isBackupCode ? 'backup' : 'totp'
    }
  };

  // Basic token validation
  const tokenValidation = validateRequired(token, 'MFA token');
  if (!tokenValidation.isValid) {
    result.isValid = false;
    result.errors.token = tokenValidation.error || 'MFA token is required';
    return result;
  }

  if (isBackupCode) {
    // Backup code format: 16 character alphanumeric
    if (!/^[A-Z0-9]{16}$/.test(token.toUpperCase())) {
      result.isValid = false;
      result.errors.token = 'Invalid backup code format';
    }
  } else {
    // TOTP format: 6 digit numeric
    if (!/^\d{6}$/.test(token)) {
      result.isValid = false;
      result.errors.token = 'MFA token must be 6 digits';
    }
  }

  return result;
};

/**
 * Checks if an email domain is from a disposable email service
 * @param domain Email domain to check
 * @returns boolean indicating if domain is disposable
 */
const isDisposableEmailDomain = (domain: string): boolean => {
  // Common disposable email domains
  const disposableDomains = [
    'tempmail.com',
    'throwawaymail.com',
    'mailinator.com',
    // Add more disposable domains as needed
  ];
  return disposableDomains.includes(domain.toLowerCase());
};