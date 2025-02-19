/**
 * @fileoverview Core validation utilities for data validation across microservices
 * Implements standardized validation patterns with enhanced security and performance
 * @version 1.0.0
 */

import * as joi from 'joi'; // ^17.11.0
import { IValidationError } from '../interfaces/error.interface';
import { VALIDATION_ERRORS } from '../constants/error-codes';

// Cache for compiled Joi schemas to improve performance
const schemaCache = new Map<string, joi.Schema>();

/**
 * Options for schema validation
 */
interface ValidationOptions {
  abortEarly?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  context?: Record<string, any>;
}

/**
 * Default validation options
 */
const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: true,
};

/**
 * Validates that all required fields are present and not empty
 * @param data Object containing fields to validate
 * @param requiredFields Array of field names that are required
 * @param context Additional context for validation
 * @returns Array of validation errors for missing required fields
 */
export function validateRequired(
  data: Record<string, any>,
  requiredFields: string[],
  context?: Record<string, any>
): IValidationError[] {
  const errors: IValidationError[] = [];

  for (const field of requiredFields) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      errors.push({
        field,
        constraints: {
          required: `Field ${field} is required`,
        },
        value,
        context: {
          ...context,
          errorCode: VALIDATION_ERRORS.REQUIRED_FIELD,
        },
      });
    }
  }

  return errors;
}

/**
 * Validates email format using RFC 5322 pattern
 * @param email Email string to validate
 * @returns Validation error if email is invalid, null if valid
 */
export function validateEmail(email: string): IValidationError | null {
  // RFC 5322 compliant email regex pattern
  const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!email || !emailPattern.test(email)) {
    return {
      field: 'email',
      constraints: {
        format: 'Invalid email format',
      },
      value: email,
      context: {
        errorCode: VALIDATION_ERRORS.INVALID_FORMAT,
        pattern: 'RFC 5322',
      },
    };
  }

  return null;
}

/**
 * Validates string length with unicode support
 * @param value String to validate
 * @param min Minimum length
 * @param max Maximum length
 * @param field Field name for error reporting
 * @returns Validation error if length is invalid, null if valid
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  field: string
): IValidationError | null {
  if (!value) return null;

  // Use Array.from to correctly count unicode characters
  const length = Array.from(value).length;

  if (length < min || length > max) {
    return {
      field,
      constraints: {
        length: `${field} length must be between ${min} and ${max} characters`,
      },
      value,
      context: {
        errorCode: VALIDATION_ERRORS.INVALID_LENGTH,
        min,
        max,
        actual: length,
      },
    };
  }

  return null;
}

/**
 * Validates data against a Joi schema with caching
 * @param data Object to validate
 * @param schema Joi validation schema
 * @param options Validation options
 * @returns Array of validation errors
 */
export function validateSchema(
  data: Record<string, any>,
  schema: joi.Schema,
  options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS
): IValidationError[] {
  const schemaKey = schema.toString();
  let cachedSchema = schemaCache.get(schemaKey);

  if (!cachedSchema) {
    cachedSchema = schema;
    schemaCache.set(schemaKey, cachedSchema);
  }

  const validationResult = cachedSchema.validate(data, {
    ...DEFAULT_VALIDATION_OPTIONS,
    ...options,
  });

  if (!validationResult.error) {
    return [];
  }

  return validationResult.error.details.map((detail) => ({
    field: detail.path.join('.'),
    constraints: {
      [detail.type]: detail.message,
    },
    value: detail.context?.value,
    context: {
      errorCode: VALIDATION_ERRORS.SCHEMA_VALIDATION_FAILED,
      type: detail.type,
      ...options.context,
    },
  }));
}

/**
 * Clears the schema cache
 * Useful for testing or when schemas are updated
 */
export function clearSchemaCache(): void {
  schemaCache.clear();
}

/**
 * Combines multiple validation errors into a single array
 * @param errors Arrays of validation errors to combine
 * @returns Combined array of validation errors
 */
export function combineValidationErrors(
  ...errors: (IValidationError | IValidationError[] | null)[]
): IValidationError[] {
  return errors
    .flat()
    .filter((error): error is IValidationError => error !== null);
}