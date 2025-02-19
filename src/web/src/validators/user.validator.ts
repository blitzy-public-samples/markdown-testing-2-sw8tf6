/**
 * User Validator
 * Implements validation functions for user-related operations including registration,
 * profile updates, and search filters.
 * @version 1.0.0
 */

import { 
  validateRequired, 
  validateEmail, 
  validatePassword, 
  validateLength 
} from '../utils/validation.util';
import { 
  IUser, 
  IUserProfile, 
  IUserFilter, 
  UserRole 
} from '../interfaces/user.interface';
import { ERROR_MESSAGES } from '../constants/validation.constants';

/**
 * Interface for validation results
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates user registration data
 * @param userData User registration data
 * @returns Validation result with error messages
 */
export const validateUserRegistration = (userData: IUser): ValidationResult => {
  const errors: string[] = [];
  
  // Required field validation
  const nameRequired = validateRequired(userData.name, 'Name');
  const emailRequired = validateRequired(userData.email, 'Email');
  
  if (!nameRequired.isValid) errors.push(nameRequired.error!);
  if (!emailRequired.isValid) errors.push(emailRequired.error!);
  
  // Name length validation (3-50 characters)
  const nameLength = validateLength(userData.name, 3, 50, 'Name');
  if (!nameLength.isValid) errors.push(nameLength.error!);
  
  // Email format validation
  const emailValidation = validateEmail(userData.email);
  if (!emailValidation.isValid) errors.push(emailValidation.error!);
  
  // Password complexity validation
  const passwordValidation = validatePassword(userData.password);
  if (!passwordValidation.isValid) {
    errors.push(passwordValidation.error!);
    if (passwordValidation.metadata?.requirements) {
      errors.push(`Missing requirements: ${passwordValidation.metadata.requirements.join(', ')}`);
    }
  }
  
  // Role validation
  if (!Object.values(UserRole).includes(userData.role)) {
    errors.push('Invalid user role specified');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates user profile update data
 * @param profileData User profile update data
 * @returns Validation result with error messages
 */
export const validateUserProfile = (profileData: IUserProfile): ValidationResult => {
  const errors: string[] = [];
  
  // Required field validation
  const nameRequired = validateRequired(profileData.name, 'Name');
  const emailRequired = validateRequired(profileData.email, 'Email');
  
  if (!nameRequired.isValid) errors.push(nameRequired.error!);
  if (!emailRequired.isValid) errors.push(emailRequired.error!);
  
  // Name length validation
  const nameLength = validateLength(profileData.name, 3, 50, 'Name');
  if (!nameLength.isValid) errors.push(nameLength.error!);
  
  // Email format validation
  const emailValidation = validateEmail(profileData.email);
  if (!emailValidation.isValid) errors.push(emailValidation.error!);
  
  // Avatar URL validation (optional)
  if (profileData.avatar) {
    try {
      new URL(profileData.avatar);
    } catch (e) {
      errors.push('Invalid avatar URL format');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates user search and filter parameters
 * @param filterData User filter parameters
 * @returns Validation result with error messages
 */
export const validateUserFilter = (filterData: IUserFilter): ValidationResult => {
  const errors: string[] = [];
  
  // Validate pagination parameters
  if (!Number.isInteger(filterData.page) || filterData.page < 1 || filterData.page > 1000) {
    errors.push('Page number must be between 1 and 1000');
  }
  
  if (!Number.isInteger(filterData.limit) || filterData.limit < 1 || filterData.limit > 100) {
    errors.push('Limit must be between 1 and 100');
  }
  
  // Validate email filter if provided
  if (filterData.email) {
    const emailValidation = validateEmail(filterData.email);
    if (!emailValidation.isValid) errors.push(emailValidation.error!);
  }
  
  // Validate name filter if provided
  if (filterData.name) {
    const nameLength = validateLength(filterData.name, 2, 50, 'Name filter');
    if (!nameLength.isValid) errors.push(nameLength.error!);
  }
  
  // Validate role filter if provided
  if (filterData.role && !Object.values(UserRole).includes(filterData.role)) {
    errors.push('Invalid role filter specified');
  }
  
  // Validate sort parameters
  const validSortFields = ['name', 'email', 'role', 'createdAt', 'lastLoginAt'];
  if (!validSortFields.includes(filterData.sortBy)) {
    errors.push(`Sort field must be one of: ${validSortFields.join(', ')}`);
  }
  
  if (!['asc', 'desc'].includes(filterData.sortOrder)) {
    errors.push("Sort order must be either 'asc' or 'desc'");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};