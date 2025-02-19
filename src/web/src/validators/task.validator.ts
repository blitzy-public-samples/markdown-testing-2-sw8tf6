/**
 * Task Validator
 * Provides comprehensive validation for task-related data with support for
 * internationalization and custom validation rules
 * @version 1.0.0
 */

import { 
  validateRequired, 
  validateDate, 
  validateLength 
} from '../utils/validation.util';
import { 
  TASK_RULES, 
  ERROR_MESSAGES 
} from '../constants/validation.constants';
import { 
  ITaskCreateDTO, 
  ITaskUpdateDTO, 
  TaskStatus, 
  TaskPriority 
} from '../interfaces/task.interface';
import { UserRole } from '../interfaces/user.interface';

/**
 * Validation result interface with metadata and error context
 */
interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  metadata?: Record<string, any>;
  context?: Record<string, any>;
}

/**
 * Workflow transition rules defining allowed status changes per role
 */
const WORKFLOW_RULES = {
  [UserRole.ADMIN]: {
    [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED, TaskStatus.COMPLETED],
    [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW, TaskStatus.BLOCKED, TaskStatus.TODO],
    [TaskStatus.IN_REVIEW]: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
    [TaskStatus.COMPLETED]: [TaskStatus.IN_REVIEW],
    [TaskStatus.BLOCKED]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
  },
  [UserRole.MANAGER]: {
    [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
    [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW, TaskStatus.BLOCKED, TaskStatus.TODO],
    [TaskStatus.IN_REVIEW]: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS],
    [TaskStatus.COMPLETED]: [TaskStatus.IN_REVIEW],
    [TaskStatus.BLOCKED]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
  },
  [UserRole.USER]: {
    [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS],
    [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW],
    [TaskStatus.IN_REVIEW]: [],
    [TaskStatus.COMPLETED]: [],
    [TaskStatus.BLOCKED]: []
  }
};

/**
 * Validates task creation data against business rules and constraints
 * @param taskData Task creation DTO
 * @returns Validation result with detailed error context
 */
export const validateTaskCreate = (taskData: ITaskCreateDTO): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    metadata: {
      validationStart: new Date(),
      fieldValidations: {}
    }
  };

  // Validate required title with length constraints
  const titleValidation = validateRequired(taskData.title, 'Title');
  if (!titleValidation.isValid) {
    result.errors.push(titleValidation.error!);
  } else {
    const titleLengthValidation = validateLength(
      taskData.title,
      TASK_RULES.TITLE_MIN_LENGTH,
      TASK_RULES.TITLE_MAX_LENGTH,
      'Title'
    );
    if (!titleLengthValidation.isValid) {
      result.errors.push(titleLengthValidation.error!);
    }
  }
  result.metadata.fieldValidations.title = titleValidation;

  // Validate description length if provided
  if (taskData.description) {
    const descValidation = validateLength(
      taskData.description,
      0,
      TASK_RULES.DESCRIPTION_MAX_LENGTH,
      'Description'
    );
    if (!descValidation.isValid) {
      result.errors.push(descValidation.error!);
    }
    result.metadata.fieldValidations.description = descValidation;
  }

  // Validate required project ID
  const projectValidation = validateRequired(taskData.projectId, 'Project');
  if (!projectValidation.isValid) {
    result.errors.push(projectValidation.error!);
  }
  result.metadata.fieldValidations.projectId = projectValidation;

  // Validate required assignee ID
  const assigneeValidation = validateRequired(taskData.assigneeId, 'Assignee');
  if (!assigneeValidation.isValid) {
    result.errors.push(assigneeValidation.error!);
  }
  result.metadata.fieldValidations.assigneeId = assigneeValidation;

  // Validate required priority
  if (!Object.values(TaskPriority).includes(taskData.priority)) {
    result.errors.push('Invalid task priority');
  }
  result.metadata.fieldValidations.priority = { isValid: true };

  // Validate required due date
  const dueDateValidation = validateDate(taskData.dueDate, false);
  if (!dueDateValidation.isValid) {
    result.errors.push(dueDateValidation.error!);
  }
  result.metadata.fieldValidations.dueDate = dueDateValidation;

  // Validate optional attachments
  if (taskData.attachments?.length > 0) {
    // Add attachment validation logic here if needed
    result.metadata.fieldValidations.attachments = { isValid: true };
  }

  // Validate optional tags
  if (taskData.tags?.length > 0) {
    const invalidTags = taskData.tags.filter(tag => tag.length > 20);
    if (invalidTags.length > 0) {
      result.errors.push('Tags must not exceed 20 characters');
    }
    result.metadata.fieldValidations.tags = { isValid: invalidTags.length === 0 };
  }

  result.isValid = result.errors.length === 0;
  result.metadata.validationEnd = new Date();
  result.metadata.validationDuration = 
    result.metadata.validationEnd.getTime() - result.metadata.validationStart.getTime();

  return result;
};

/**
 * Validates task update data with partial update support
 * @param taskData Task update DTO
 * @returns Validation result with detailed error context
 */
export const validateTaskUpdate = (taskData: ITaskUpdateDTO): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    metadata: {
      validationStart: new Date(),
      fieldValidations: {}
    }
  };

  // Validate title if provided
  if (taskData.title !== undefined) {
    const titleLengthValidation = validateLength(
      taskData.title,
      TASK_RULES.TITLE_MIN_LENGTH,
      TASK_RULES.TITLE_MAX_LENGTH,
      'Title'
    );
    if (!titleLengthValidation.isValid) {
      result.errors.push(titleLengthValidation.error!);
    }
    result.metadata.fieldValidations.title = titleLengthValidation;
  }

  // Validate description if provided
  if (taskData.description !== undefined) {
    const descValidation = validateLength(
      taskData.description,
      0,
      TASK_RULES.DESCRIPTION_MAX_LENGTH,
      'Description'
    );
    if (!descValidation.isValid) {
      result.errors.push(descValidation.error!);
    }
    result.metadata.fieldValidations.description = descValidation;
  }

  // Validate status if provided
  if (taskData.status !== undefined) {
    if (!Object.values(TaskStatus).includes(taskData.status)) {
      result.errors.push('Invalid task status');
    }
    result.metadata.fieldValidations.status = { isValid: true };
  }

  // Validate priority if provided
  if (taskData.priority !== undefined) {
    if (!Object.values(TaskPriority).includes(taskData.priority)) {
      result.errors.push('Invalid task priority');
    }
    result.metadata.fieldValidations.priority = { isValid: true };
  }

  // Validate due date if provided
  if (taskData.dueDate !== undefined) {
    const dueDateValidation = validateDate(taskData.dueDate, false);
    if (!dueDateValidation.isValid) {
      result.errors.push(dueDateValidation.error!);
    }
    result.metadata.fieldValidations.dueDate = dueDateValidation;
  }

  // Validate attachments if provided
  if (taskData.attachments !== undefined) {
    // Add attachment validation logic here if needed
    result.metadata.fieldValidations.attachments = { isValid: true };
  }

  // Validate tags if provided
  if (taskData.tags !== undefined) {
    const invalidTags = taskData.tags.filter(tag => tag.length > 20);
    if (invalidTags.length > 0) {
      result.errors.push('Tags must not exceed 20 characters');
    }
    result.metadata.fieldValidations.tags = { isValid: invalidTags.length === 0 };
  }

  result.isValid = result.errors.length === 0;
  result.metadata.validationEnd = new Date();
  result.metadata.validationDuration = 
    result.metadata.validationEnd.getTime() - result.metadata.validationStart.getTime();

  return result;
};

/**
 * Validates task status transitions according to workflow rules
 * @param currentStatus Current task status
 * @param newStatus Proposed new status
 * @param userRole Role of the user attempting the transition
 * @returns Validation result with transition context
 */
export const validateTaskStatus = (
  currentStatus: TaskStatus,
  newStatus: TaskStatus,
  userRole: UserRole
): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    context: {
      transitionStart: new Date(),
      fromStatus: currentStatus,
      toStatus: newStatus,
      userRole: userRole
    }
  };

  // Validate status values
  if (!Object.values(TaskStatus).includes(currentStatus) || 
      !Object.values(TaskStatus).includes(newStatus)) {
    result.errors.push('Invalid task status');
    result.isValid = false;
    return result;
  }

  // Check if user role has permission for this transition
  const allowedTransitions = WORKFLOW_RULES[userRole]?.[currentStatus] || [];
  if (!allowedTransitions.includes(newStatus)) {
    result.errors.push(`${userRole} is not allowed to change task status from ${currentStatus} to ${newStatus}`);
    result.isValid = false;
  }

  result.context!.transitionEnd = new Date();
  result.context!.transitionDuration = 
    result.context!.transitionEnd.getTime() - result.context!.transitionStart.getTime();

  return result;
};