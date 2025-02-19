/**
 * @fileoverview Date utility functions for task management system
 * @version 1.0.0
 * 
 * Provides comprehensive date manipulation utilities with:
 * - Timezone awareness
 * - Business calendar support
 * - Robust validation
 * - Audit trail support
 */

import { format, isValid, parseISO, addDays, differenceInDays } from 'date-fns'; // ^2.30.0
import { IBaseEntity } from '../interfaces/base.interface';

// Default format for dates across the application
const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd\'T\'HH:mm:ssxxx';

// Business calendar configuration
const BUSINESS_DAYS = [1, 2, 3, 4, 5]; // Monday to Friday
const HOLIDAYS: Date[] = []; // To be populated with holiday calendar

/**
 * Formats a date into a standardized string format with timezone support
 * @param date The date to format
 * @param formatString Custom format string (optional)
 * @param timezone Target timezone (optional)
 * @param locale Locale for formatting (optional)
 * @returns Formatted date string
 * @throws Error if date is invalid
 */
export const formatDate = (
    date: Date,
    formatString: string = DEFAULT_DATE_FORMAT,
    timezone: string = 'UTC',
    locale: string = 'en-US'
): string => {
    if (!isValid(date)) {
        throw new Error('Invalid date provided for formatting');
    }

    try {
        const dateInTimezone = new Date(
            date.toLocaleString('en-US', { timeZone: timezone })
        );
        return format(dateInTimezone, formatString, { locale });
    } catch (error) {
        throw new Error(`Error formatting date: ${error.message}`);
    }
};

/**
 * Parses a date string into a Date object with timezone handling
 * @param dateString The date string to parse
 * @param timezone Source timezone (optional)
 * @returns Parsed Date object
 * @throws Error if parsing fails
 */
export const parseDate = (dateString: string, timezone: string = 'UTC'): Date => {
    try {
        const parsedDate = parseISO(dateString);
        if (!isValid(parsedDate)) {
            throw new Error('Invalid date string format');
        }

        // Convert to specified timezone
        return new Date(
            parsedDate.toLocaleString('en-US', { timeZone: timezone })
        );
    } catch (error) {
        throw new Error(`Error parsing date: ${error.message}`);
    }
};

/**
 * Validates if a date meets business rules and format requirements
 * @param date Date to validate
 * @param validationRules Optional validation rules
 * @returns Boolean indicating validity
 */
export const isValidDate = (
    date: Date | string,
    validationRules?: {
        minDate?: Date;
        maxDate?: Date;
        allowWeekends?: boolean;
        allowHolidays?: boolean;
    }
): boolean => {
    const dateToValidate = typeof date === 'string' ? parseDate(date) : date;

    if (!isValid(dateToValidate)) {
        return false;
    }

    if (validationRules) {
        const { minDate, maxDate, allowWeekends, allowHolidays } = validationRules;

        if (minDate && dateToValidate < minDate) return false;
        if (maxDate && dateToValidate > maxDate) return false;
        if (!allowWeekends && !BUSINESS_DAYS.includes(dateToValidate.getDay())) return false;
        if (!allowHolidays && HOLIDAYS.some(h => h.getTime() === dateToValidate.getTime())) return false;
    }

    return true;
};

/**
 * Calculates task due date based on duration with business calendar support
 * @param durationInDays Number of days to add
 * @param useBusinessDays Consider only business days
 * @param timezone Target timezone
 * @returns Calculated due date
 */
export const calculateDueDate = (
    durationInDays: number,
    useBusinessDays: boolean = true,
    timezone: string = 'UTC'
): Date => {
    let currentDate = new Date();
    let remainingDays = durationInDays;
    
    // Convert to target timezone
    currentDate = new Date(
        currentDate.toLocaleString('en-US', { timeZone: timezone })
    );

    if (!useBusinessDays) {
        return addDays(currentDate, durationInDays);
    }

    while (remainingDays > 0) {
        currentDate = addDays(currentDate, 1);
        
        // Skip weekends and holidays
        if (
            BUSINESS_DAYS.includes(currentDate.getDay()) &&
            !HOLIDAYS.some(h => h.getTime() === currentDate.getTime())
        ) {
            remainingDays--;
        }
    }

    return currentDate;
};

/**
 * Calculates days remaining until due date
 * @param dueDate Target due date
 * @param useBusinessDays Consider only business days
 * @param timezone Target timezone
 * @returns Number of days until due
 */
export const getDaysUntilDue = (
    dueDate: Date,
    useBusinessDays: boolean = true,
    timezone: string = 'UTC'
): number => {
    const currentDate = new Date(
        new Date().toLocaleString('en-US', { timeZone: timezone })
    );
    
    if (!useBusinessDays) {
        return Math.max(0, differenceInDays(dueDate, currentDate));
    }

    let businessDays = 0;
    let tempDate = new Date(currentDate);

    while (tempDate < dueDate) {
        tempDate = addDays(tempDate, 1);
        if (
            BUSINESS_DAYS.includes(tempDate.getDay()) &&
            !HOLIDAYS.some(h => h.getTime() === tempDate.getTime())
        ) {
            businessDays++;
        }
    }

    return businessDays;
};

/**
 * Gets current timestamp fields for entity creation/update
 * @param userId Optional user ID for audit
 * @param timezone Target timezone
 * @returns Object with timestamp fields
 */
export const getTimestampFields = (
    userId?: string,
    timezone: string = 'UTC'
): Pick<IBaseEntity, 'createdAt' | 'updatedAt'> & {
    createdBy?: string;
    updatedBy?: string;
} => {
    const now = new Date(
        new Date().toLocaleString('en-US', { timeZone: timezone })
    );

    const fields: any = {
        createdAt: now,
        updatedAt: now
    };

    if (userId) {
        fields.createdBy = userId;
        fields.updatedBy = userId;
    }

    return fields;
};