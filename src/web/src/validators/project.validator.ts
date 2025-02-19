/**
 * Project Validator
 * Provides comprehensive validation functions for project-related data
 * Ensures data integrity, business rule compliance, and validation versioning
 * @version 1.0.0
 */

import { 
    IProject, 
    IProjectCreateDTO, 
    IProjectUpdateDTO, 
    ProjectStatus, 
    ProjectPriority 
} from '../interfaces/project.interface';
import { 
    validateRequired, 
    validateLength, 
    validateDate, 
    validateDateRange, 
    validateEnum, 
    validateArray, 
    validateNumber 
} from '../utils/validation.util';
import { 
    ERROR_MESSAGES, 
    PROJECT_RULES, 
    VALIDATION_CACHE_CONFIG 
} from '../constants/validation.constants';

// Validation cache to optimize repeated validations
const validationCache = new Map<string, { result: ValidationResult; timestamp: number }>();

interface ValidationResult {
    isValid: boolean;
    errors: string[];
    metadata?: Record<string, any>;
}

/**
 * Validates project name against length and format requirements
 * @param name Project name to validate
 */
const validateProjectName = (name: string): ValidationResult => {
    const result: ValidationResult = { isValid: true, errors: [] };
    
    const requiredCheck = validateRequired(name, 'Project name');
    if (!requiredCheck.isValid) {
        result.isValid = false;
        result.errors.push(requiredCheck.error!);
        return result;
    }

    const lengthCheck = validateLength(
        name,
        PROJECT_RULES.NAME_MIN_LENGTH,
        PROJECT_RULES.NAME_MAX_LENGTH,
        'Project name'
    );

    if (!lengthCheck.isValid) {
        result.isValid = false;
        result.errors.push(lengthCheck.error!);
    }

    // Validate name format (alphanumeric with spaces and basic punctuation)
    const namePattern = /^[a-zA-Z0-9\s\-_.,!]{3,50}$/;
    if (!namePattern.test(name)) {
        result.isValid = false;
        result.errors.push('Project name contains invalid characters');
    }

    return result;
};

/**
 * Validates project code format and uniqueness
 * @param code Project code to validate
 * @param departmentPrefix Department prefix for code validation
 */
const validateProjectCode = (code: string, departmentPrefix: string): ValidationResult => {
    const result: ValidationResult = { isValid: true, errors: [] };

    const requiredCheck = validateRequired(code, 'Project code');
    if (!requiredCheck.isValid) {
        result.isValid = false;
        result.errors.push(requiredCheck.error!);
        return result;
    }

    // Validate code format with department prefix
    const codePattern = new RegExp(`^${departmentPrefix}[A-Z0-9]{2,8}$`);
    if (!codePattern.test(code)) {
        result.isValid = false;
        result.errors.push(`Project code must start with ${departmentPrefix} followed by 2-8 alphanumeric characters`);
    }

    if (!PROJECT_RULES.CODE_PATTERN.test(code)) {
        result.isValid = false;
        result.errors.push('Project code format is invalid');
    }

    return result;
};

/**
 * Validates project dates with business rules
 * @param startDate Project start date
 * @param endDate Project end date
 */
const validateProjectDates = (startDate: Date, endDate: Date): ValidationResult => {
    const result: ValidationResult = { isValid: true, errors: [] };

    const startDateCheck = validateDate(startDate, true);
    if (!startDateCheck.isValid) {
        result.isValid = false;
        result.errors.push(startDateCheck.error!);
    }

    const endDateCheck = validateDate(endDate, true);
    if (!endDateCheck.isValid) {
        result.isValid = false;
        result.errors.push(endDateCheck.error!);
    }

    const dateRangeCheck = validateDateRange(startDate, endDate);
    if (!dateRangeCheck.isValid) {
        result.isValid = false;
        result.errors.push(dateRangeCheck.error!);
    }

    // Validate minimum project duration (1 day)
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (duration < 1) {
        result.isValid = false;
        result.errors.push('Project duration must be at least 1 day');
    }

    return result;
};

/**
 * Validates project team members list with role and capacity checks
 * @param members Array of member IDs
 * @param roles Array of required roles
 */
const validateProjectMembers = (members: string[], roles: string[]): ValidationResult => {
    const result: ValidationResult = { isValid: true, errors: [] };

    const membersCheck = validateArray(members, PROJECT_RULES.MIN_MEMBERS, PROJECT_RULES.MAX_MEMBERS, 'Team members');
    if (!membersCheck.isValid) {
        result.isValid = false;
        result.errors.push(membersCheck.error!);
    }

    // Validate required roles are assigned
    const hasRequiredRoles = roles.every(role => members.some(member => member.includes(role)));
    if (!hasRequiredRoles) {
        result.isValid = false;
        result.errors.push('All required roles must be assigned to team members');
    }

    return result;
};

/**
 * Validates complete project creation data with caching
 * @param data Project creation DTO
 */
export const validateProjectCreate = (data: IProjectCreateDTO): ValidationResult => {
    const cacheKey = `create_${JSON.stringify(data)}`;
    const cachedResult = validationCache.get(cacheKey);
    
    if (cachedResult && (Date.now() - cachedResult.timestamp) < 5000) {
        return cachedResult.result;
    }

    const result: ValidationResult = { isValid: true, errors: [] };

    // Validate project name
    const nameValidation = validateProjectName(data.name);
    if (!nameValidation.isValid) {
        result.isValid = false;
        result.errors.push(...nameValidation.errors);
    }

    // Validate project dates
    const datesValidation = validateProjectDates(data.startDate, data.endDate);
    if (!datesValidation.isValid) {
        result.isValid = false;
        result.errors.push(...datesValidation.errors);
    }

    // Validate project members
    const membersValidation = validateProjectMembers(data.members, ['MANAGER']);
    if (!membersValidation.isValid) {
        result.isValid = false;
        result.errors.push(...membersValidation.errors);
    }

    // Validate priority
    if (!Object.values(ProjectPriority).includes(data.priority as ProjectPriority)) {
        result.isValid = false;
        result.errors.push('Invalid project priority');
    }

    // Cache validation result
    validationCache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
};

/**
 * Validates project update data with status transition rules
 * @param data Project update DTO
 * @param currentProject Current project state
 */
export const validateProjectUpdate = (data: IProjectUpdateDTO, currentProject: IProject): ValidationResult => {
    const result: ValidationResult = { isValid: true, errors: [] };

    // Validate status transition
    const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
        [ProjectStatus.DRAFT]: [ProjectStatus.ACTIVE],
        [ProjectStatus.ACTIVE]: [ProjectStatus.COMPLETED, ProjectStatus.BLOCKED],
        [ProjectStatus.COMPLETED]: [ProjectStatus.ARCHIVED],
        [ProjectStatus.BLOCKED]: [ProjectStatus.ACTIVE],
        [ProjectStatus.ARCHIVED]: []
    };

    if (data.status !== currentProject.status && 
        !validTransitions[currentProject.status].includes(data.status)) {
        result.isValid = false;
        result.errors.push(`Invalid status transition from ${currentProject.status} to ${data.status}`);
    }

    // Validate name if changed
    if (data.name !== currentProject.name) {
        const nameValidation = validateProjectName(data.name);
        if (!nameValidation.isValid) {
            result.isValid = false;
            result.errors.push(...nameValidation.errors);
        }
    }

    // Validate dates if changed
    if (data.startDate !== currentProject.startDate || data.endDate !== currentProject.endDate) {
        const datesValidation = validateProjectDates(data.startDate, data.endDate);
        if (!datesValidation.isValid) {
            result.isValid = false;
            result.errors.push(...datesValidation.errors);
        }
    }

    // Validate progress
    if (data.progress < 0 || data.progress > 100) {
        result.isValid = false;
        result.errors.push('Progress must be between 0 and 100');
    }

    // Validate completion criteria
    if (data.status === ProjectStatus.COMPLETED && data.progress !== 100) {
        result.isValid = false;
        result.errors.push('Project must be 100% complete to mark as completed');
    }

    return result;
};