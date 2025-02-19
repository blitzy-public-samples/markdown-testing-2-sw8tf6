/**
 * Validation Utilities
 * Core validation functions for form validation, data integrity checks, and business rule validation
 * @version 1.0.0
 */

import { 
  ERROR_MESSAGES, 
  PASSWORD_RULES, 
  EMAIL_PATTERN,
  TASK_RULES,
  PROJECT_RULES,
  DATE_RULES,
  INPUT_RULES
} from '../constants/validation.constants';

/**
 * Validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: Record<string, any>;
  aria?: Record<string, string>;
}

/**
 * Sanitizes input string to prevent XSS
 * @param value Input value to sanitize
 */
const sanitizeInput = (value: string): string => {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>]/g, '');
};

/**
 * Validates that a required field has a non-empty value
 * @param value Value to validate
 * @param fieldName Field name for error message
 */
export const validateRequired = (value: any, fieldName: string): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    aria: {
      'aria-required': 'true'
    }
  };

  if (value === null || value === undefined) {
    result.isValid = false;
  } else if (typeof value === 'string' && value.trim() === '') {
    result.isValid = false;
  } else if (Array.isArray(value) && value.length === 0) {
    result.isValid = false;
  } else if (typeof value === 'object' && !Object.keys(value).length) {
    result.isValid = false;
  }

  if (!result.isValid) {
    result.error = `${fieldName} ${ERROR_MESSAGES.REQUIRED_FIELD}`;
    result.aria['aria-invalid'] = 'true';
    result.aria['aria-errormessage'] = `${fieldName}-error`;
  }

  return result;
};

/**
 * Validates email format using RFC compliant pattern
 * @param email Email to validate
 */
export const validateEmail = (email: string): ValidationResult => {
  const sanitizedEmail = sanitizeInput(email);
  const requiredCheck = validateRequired(sanitizedEmail, 'Email');
  
  if (!requiredCheck.isValid) {
    return requiredCheck;
  }

  const result: ValidationResult = {
    isValid: true,
    metadata: {
      originalValue: email,
      sanitizedValue: sanitizedEmail
    },
    aria: {
      'aria-required': 'true'
    }
  };

  if (sanitizedEmail.length > 254) {
    result.isValid = false;
    result.error = ERROR_MESSAGES.INVALID_EMAIL;
  } else if (!EMAIL_PATTERN.test(sanitizedEmail)) {
    result.isValid = false;
    result.error = ERROR_MESSAGES.INVALID_EMAIL;
  }

  if (!result.isValid) {
    result.aria['aria-invalid'] = 'true';
    result.aria['aria-errormessage'] = 'email-error';
  }

  return result;
};

/**
 * Validates password against security requirements
 * @param password Password to validate
 */
export const validatePassword = (password: string): ValidationResult => {
  const requiredCheck = validateRequired(password, 'Password');
  
  if (!requiredCheck.isValid) {
    return requiredCheck;
  }

  const result: ValidationResult = {
    isValid: true,
    metadata: {
      strength: 0,
      requirements: []
    },
    aria: {
      'aria-required': 'true'
    }
  };

  const requirements: string[] = [];

  if (password.length < PASSWORD_RULES.MIN_LENGTH) {
    requirements.push(`Minimum ${PASSWORD_RULES.MIN_LENGTH} characters`);
  }
  if (PASSWORD_RULES.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    requirements.push('Uppercase letter');
  }
  if (PASSWORD_RULES.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    requirements.push('Lowercase letter');
  }
  if (PASSWORD_RULES.REQUIRE_NUMBER && !/\d/.test(password)) {
    requirements.push('Number');
  }
  if (PASSWORD_RULES.REQUIRE_SPECIAL && !new RegExp(`[${PASSWORD_RULES.SPECIAL_CHARS}]`).test(password)) {
    requirements.push('Special character');
  }

  if (requirements.length > 0) {
    result.isValid = false;
    result.error = ERROR_MESSAGES.INVALID_PASSWORD;
    result.metadata.requirements = requirements;
    result.aria['aria-invalid'] = 'true';
    result.aria['aria-errormessage'] = 'password-error';
  }

  // Calculate password strength
  result.metadata.strength = Math.min(100, Math.floor((password.length / 20) * 100) +
    (/[A-Z]/.test(password) ? 20 : 0) +
    (/[a-z]/.test(password) ? 20 : 0) +
    (/\d/.test(password) ? 20 : 0) +
    (new RegExp(`[${PASSWORD_RULES.SPECIAL_CHARS}]`).test(password) ? 20 : 0));

  return result;
};

/**
 * Validates date with timezone consideration
 * @param date Date to validate
 * @param allowPastDates Whether past dates are allowed
 * @param timezone Timezone for date validation
 */
export const validateDate = (
  date: Date,
  allowPastDates: boolean = false,
  timezone: string = 'UTC'
): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    metadata: {
      timezone,
      originalDate: date
    },
    aria: {
      'aria-required': 'true'
    }
  };

  if (!(date instanceof Date) || isNaN(date.getTime())) {
    result.isValid = false;
    result.error = ERROR_MESSAGES.INVALID_DATE;
    result.aria['aria-invalid'] = 'true';
    return result;
  }

  const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  const now = new Date();
  const maxFutureDate = new Date(now.getTime() + (DATE_RULES.MAX_FUTURE_DAYS * 24 * 60 * 60 * 1000));

  if (!allowPastDates && localDate < now) {
    result.isValid = false;
    result.error = 'Date cannot be in the past';
  } else if (localDate > maxFutureDate) {
    result.isValid = false;
    result.error = `Date cannot be more than ${DATE_RULES.MAX_FUTURE_DAYS} days in the future`;
  }

  if (!result.isValid) {
    result.aria['aria-invalid'] = 'true';
    result.aria['aria-errormessage'] = 'date-error';
  }

  return result;
};

/**
 * Validates date range with business rules
 * @param startDate Range start date
 * @param endDate Range end date
 * @param timezone Timezone for date validation
 */
export const validateDateRange = (
  startDate: Date,
  endDate: Date,
  timezone: string = 'UTC'
): ValidationResult => {
  const startValidation = validateDate(startDate, true, timezone);
  const endValidation = validateDate(endDate, true, timezone);

  if (!startValidation.isValid) return startValidation;
  if (!endValidation.isValid) return endValidation;

  const result: ValidationResult = {
    isValid: true,
    metadata: {
      timezone,
      startDate,
      endDate,
      durationDays: 0
    },
    aria: {
      'aria-required': 'true'
    }
  };

  const localStartDate = new Date(startDate.toLocaleString('en-US', { timeZone: timezone }));
  const localEndDate = new Date(endDate.toLocaleString('en-US', { timeZone: timezone }));

  if (localEndDate <= localStartDate) {
    result.isValid = false;
    result.error = ERROR_MESSAGES.DATE_RANGE_INVALID;
    result.aria['aria-invalid'] = 'true';
    result.aria['aria-errormessage'] = 'date-range-error';
  }

  result.metadata.durationDays = Math.ceil(
    (localEndDate.getTime() - localStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return result;
};

/**
 * Validates string length with multi-byte support
 * @param value String to validate
 * @param minLength Minimum length required
 * @param maxLength Maximum length allowed
 * @param fieldName Field name for error message
 */
export const validateLength = (
  value: string,
  minLength: number,
  maxLength: number,
  fieldName: string
): ValidationResult => {
  const sanitizedValue = sanitizeInput(value);
  const result: ValidationResult = {
    isValid: true,
    metadata: {
      length: sanitizedValue.length,
      minLength,
      maxLength
    },
    aria: {}
  };

  if (sanitizedValue.length < minLength) {
    result.isValid = false;
    result.error = ERROR_MESSAGES.MIN_LENGTH(fieldName, minLength);
  } else if (sanitizedValue.length > maxLength) {
    result.isValid = false;
    result.error = ERROR_MESSAGES.MAX_LENGTH(fieldName, maxLength);
  }

  if (!result.isValid) {
    result.aria['aria-invalid'] = 'true';
    result.aria['aria-errormessage'] = `${fieldName}-length-error`;
  }

  return result;
};