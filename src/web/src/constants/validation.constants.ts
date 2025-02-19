/**
 * Validation Constants
 * Defines validation rules, constraints, and error messages for application-wide data validation
 * @version 1.0.0
 */

/**
 * Standard error messages for validation failures
 */
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PASSWORD: 'Password must meet complexity requirements: minimum 12 characters, including uppercase, lowercase, number, and special character',
  INVALID_DATE: 'Please enter a valid date',
  DATE_RANGE_INVALID: 'End date must be after start date',
  MIN_LENGTH: (field: string, length: number) => `${field} must be at least ${length} characters`,
  MAX_LENGTH: (field: string, length: number) => `${field} must not exceed ${length} characters`,
} as const;

/**
 * Password complexity requirements
 * Based on security specifications for user authentication
 */
export const PASSWORD_RULES = {
  MIN_LENGTH: 12,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
  SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const;

/**
 * Task validation rules
 * Defines constraints for task creation and modification
 */
export const TASK_RULES = {
  TITLE_MIN_LENGTH: 3,
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 2000,
  REQUIRED_FIELDS: [
    'title',
    'projectId',
    'assigneeId',
    'dueDate',
    'priority'
  ] as const,
} as const;

/**
 * Project validation rules
 * Specifies constraints for project setup and configuration
 */
export const PROJECT_RULES = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 50,
  CODE_PATTERN: /^[A-Z0-9]{2,10}$/,
  MIN_MEMBERS: 1,
  MAX_MEMBERS: 100,
  REQUIRED_FIELDS: [
    'name',
    'code',
    'startDate',
    'ownerId'
  ] as const,
} as const;

/**
 * Email validation pattern
 * RFC 5322-compliant email validation regex
 */
export const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Date validation rules
 * Defines constraints for date fields
 */
export const DATE_RULES = {
  MIN_DATE: new Date(),
  MAX_FUTURE_DAYS: 365 * 2, // 2 years
  DATE_FORMAT: 'YYYY-MM-DD',
} as const;

/**
 * Input length constraints
 * General validation rules for input fields
 */
export const INPUT_RULES = {
  MIN_SEARCH_LENGTH: 2,
  MAX_SEARCH_LENGTH: 50,
  MAX_COMMENT_LENGTH: 1000,
  MAX_TAG_LENGTH: 20,
  MAX_TAGS: 10,
} as const;

/**
 * File upload validation rules
 * Defines constraints for file attachments
 */
export const FILE_RULES = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ] as const,
  MAX_FILES_PER_TASK: 5,
} as const;