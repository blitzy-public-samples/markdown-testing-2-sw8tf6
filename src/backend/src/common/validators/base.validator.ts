/**
 * @fileoverview Abstract base validator class providing enhanced validation functionality
 * Implements comprehensive validation with schema caching, i18n support, and detailed error tracking
 * @version 1.0.0
 */

import * as joi from 'joi'; // ^17.11.0
import { IValidationError } from '../interfaces/error.interface';
import {
  validateRequired,
  validateEmail,
  validateLength,
  validateSchema,
} from '../utils/validation.util';
import { VALIDATION_ERRORS } from '../constants/error-codes';

/**
 * Performance metrics for validation operations
 */
interface ValidationMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  schemaName: string;
  cacheHit: boolean;
}

/**
 * Abstract base validator class providing core validation functionality
 * Supports schema caching, i18n, and detailed error tracking
 */
export abstract class BaseValidator {
  protected readonly schema: joi.Schema;
  protected readonly requiredFields: string[];
  private readonly schemaCache: Map<string, joi.Schema>;
  protected readonly errorMessages: Record<string, Record<string, string>>;
  private readonly validationMetrics: ValidationMetrics[];

  /**
   * Creates an instance of BaseValidator
   * @param schema - Joi validation schema
   * @param requiredFields - Array of required field names
   * @param errorMessages - Localized error messages
   */
  constructor(
    schema: joi.Schema,
    requiredFields: string[] = [],
    errorMessages: Record<string, Record<string, string>> = {}
  ) {
    this.schema = schema;
    this.requiredFields = requiredFields;
    this.schemaCache = new Map();
    this.errorMessages = errorMessages;
    this.validationMetrics = [];

    // Pre-compile and cache the schema
    this.cacheSchema(schema);
  }

  /**
   * Validates data against schema and required fields
   * @param data - Data to validate
   * @param locale - Locale for error messages
   * @returns Array of validation errors
   */
  public async validate(
    data: Record<string, any>,
    locale: string = 'en'
  ): Promise<IValidationError[]> {
    const startTime = Date.now();
    const metrics: ValidationMetrics = {
      startTime,
      endTime: 0,
      duration: 0,
      schemaName: this.schema.describe().type,
      cacheHit: false,
    };

    try {
      // Sanitize input data
      const sanitizedData = this.sanitizeInput(data);

      // Validate required fields
      const requiredErrors = validateRequired(
        sanitizedData,
        this.requiredFields,
        { locale }
      );

      // Get cached schema or cache it
      const cachedSchema = this.getCachedSchema(this.schema);
      metrics.cacheHit = true;

      // Validate against schema
      const schemaErrors = validateSchema(sanitizedData, cachedSchema, {
        context: { locale },
      });

      // Combine and localize errors
      const combinedErrors = [...requiredErrors, ...schemaErrors].map(error => 
        this.localizeError(error, locale)
      );

      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - startTime;
      this.validationMetrics.push(metrics);

      return combinedErrors;
    } catch (error) {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - startTime;
      this.validationMetrics.push(metrics);

      throw error;
    }
  }

  /**
   * Validates email format with enhanced security checks
   * @param email - Email to validate
   * @param locale - Locale for error messages
   * @returns Validation error if invalid, null if valid
   */
  public validateEmail(
    email: string,
    locale: string = 'en'
  ): IValidationError | null {
    // Sanitize email input
    const sanitizedEmail = this.sanitizeInput(email);

    // Perform email validation
    const error = validateEmail(sanitizedEmail);

    // Localize error if present
    return error ? this.localizeError(error, locale) : null;
  }

  /**
   * Validates string length with unicode support
   * @param value - String to validate
   * @param min - Minimum length
   * @param max - Maximum length
   * @param field - Field name
   * @param locale - Locale for error messages
   * @returns Validation error if invalid, null if valid
   */
  public validateLength(
    value: string,
    min: number,
    max: number,
    field: string,
    locale: string = 'en'
  ): IValidationError | null {
    // Normalize unicode string
    const normalizedValue = value.normalize();

    // Validate length
    const error = validateLength(normalizedValue, min, max, field);

    // Localize error if present
    return error ? this.localizeError(error, locale) : null;
  }

  /**
   * Retrieves validation performance metrics
   * @returns Array of validation metrics
   */
  protected getValidationMetrics(): ValidationMetrics[] {
    return this.validationMetrics;
  }

  /**
   * Sanitizes input data for security
   * @param input - Data to sanitize
   * @returns Sanitized data
   */
  private sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Remove potential XSS vectors
      return input.replace(/<[^>]*>/g, '');
    }
    if (typeof input === 'object' && input !== null) {
      return Object.entries(input).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: this.sanitizeInput(value),
      }), {});
    }
    return input;
  }

  /**
   * Retrieves or caches Joi schema
   * @param schema - Schema to cache
   * @returns Cached schema
   */
  private getCachedSchema(schema: joi.Schema): joi.Schema {
    const schemaKey = schema.describe().type;
    let cachedSchema = this.schemaCache.get(schemaKey);

    if (!cachedSchema) {
      cachedSchema = schema;
      this.cacheSchema(schema);
    }

    return cachedSchema;
  }

  /**
   * Caches a Joi schema
   * @param schema - Schema to cache
   */
  private cacheSchema(schema: joi.Schema): void {
    const schemaKey = schema.describe().type;
    this.schemaCache.set(schemaKey, schema);
  }

  /**
   * Localizes validation error messages
   * @param error - Validation error to localize
   * @param locale - Target locale
   * @returns Localized validation error
   */
  private localizeError(
    error: IValidationError,
    locale: string
  ): IValidationError {
    const localizedConstraints: Record<string, string> = {};

    for (const [key, message] of Object.entries(error.constraints)) {
      const localizedMessage = this.errorMessages[locale]?.[`${error.field}.${key}`] 
        || this.errorMessages[locale]?.[key] 
        || message;
      localizedConstraints[key] = localizedMessage;
    }

    return {
      ...error,
      constraints: localizedConstraints,
      context: {
        ...error.context,
        locale,
      },
    };
  }
}