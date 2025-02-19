import { format, isValid, parseISO, addDays, differenceInDays } from 'date-fns'; // date-fns ^2.30.0

/**
 * Formats a date object or ISO string into a human-readable format
 * @param date - Date object, ISO string, or null
 * @param formatString - Format string following date-fns format pattern
 * @returns Formatted date string or empty string if invalid
 */
export const formatDate = (date: Date | string | null, formatString: string): string => {
  try {
    if (!date) {
      return '';
    }

    const dateObject = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(dateObject)) {
      return '';
    }

    return format(dateObject, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Validates if the provided value is a valid date
 * @param date - Date object, ISO string, or null to validate
 * @returns Boolean indicating if the date is valid
 */
export const isValidDate = (date: Date | string | null): boolean => {
  try {
    if (!date) {
      return false;
    }

    const dateObject = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObject);
  } catch (error) {
    console.error('Error validating date:', error);
    return false;
  }
};

/**
 * Determines the status of a due date relative to current date
 * @param dueDate - Due date to evaluate
 * @returns Status string indicating due date status
 */
export const getDueDateStatus = (dueDate: Date | string): 'overdue' | 'due-soon' | 'on-track' => {
  try {
    const dateObject = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
    
    if (!isValidDate(dateObject)) {
      throw new Error('Invalid due date provided');
    }

    const daysUntilDue = differenceInDays(dateObject, new Date());

    if (daysUntilDue < 0) {
      return 'overdue';
    }
    if (daysUntilDue <= 2) {
      return 'due-soon';
    }
    return 'on-track';
  } catch (error) {
    console.error('Error getting due date status:', error);
    return 'on-track'; // Default to on-track in case of error
  }
};

/**
 * Returns a human-readable relative due date string
 * @param dueDate - Due date to format
 * @returns Formatted relative date string
 */
export const getRelativeDueDate = (dueDate: Date | string): string => {
  try {
    const dateObject = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
    
    if (!isValidDate(dateObject)) {
      throw new Error('Invalid due date provided');
    }

    const today = new Date();
    const daysUntilDue = differenceInDays(dateObject, today);

    if (daysUntilDue === 0) {
      return 'Due today';
    }
    if (daysUntilDue === 1) {
      return 'Due tomorrow';
    }
    if (daysUntilDue === -1) {
      return 'Due yesterday';
    }
    if (daysUntilDue < 0) {
      return `Due ${Math.abs(daysUntilDue)} days ago`;
    }
    return `Due in ${daysUntilDue} days`;
  } catch (error) {
    console.error('Error getting relative due date:', error);
    return 'Due date unknown';
  }
};

/**
 * Parses and validates a date string, returning a Date object
 * @param dateString - ISO date string to parse
 * @returns Parsed Date object or null if invalid
 */
export const parseAndValidateDate = (dateString: string): Date | null => {
  try {
    if (!dateString) {
      return null;
    }

    const parsedDate = parseISO(dateString);
    
    if (!isValid(parsedDate)) {
      return null;
    }

    return parsedDate;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};