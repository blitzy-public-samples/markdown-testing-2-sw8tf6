import React, { memo, useCallback, useMemo, useRef } from 'react';
import ReactDatePicker from 'react-datepicker';
import classNames from 'classnames';
import { format, parseISO } from 'date-fns';
import { useLocale } from 'react-intl';
import { validateDate } from '../../utils/validation.util';

// Import styles for react-datepicker (assumed to be handled by build system)
import 'react-datepicker/dist/react-datepicker.css';

interface DatePickerProps {
  id: string;
  name: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  onBlur?: () => void;
  minDate?: Date;
  maxDate?: Date;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
  timezone?: string;
  locale?: string;
  businessHours?: {
    start: string;
    end: string;
  };
  format?: string;
  ariaLabel?: string;
  mobileOptimized?: boolean;
}

/**
 * Enterprise-grade DatePicker component with advanced validation, accessibility,
 * and timezone support.
 * 
 * @version 1.0.0
 */
const DatePicker: React.FC<DatePickerProps> = memo(({
  id,
  name,
  value,
  onChange,
  onBlur,
  minDate = new Date(),
  maxDate,
  required = false,
  disabled = false,
  error,
  className,
  placeholder = 'Select date...',
  timezone = 'UTC',
  locale: propLocale,
  businessHours = { start: '09:00', end: '17:00' },
  format: dateFormat = 'yyyy-MM-dd',
  ariaLabel,
  mobileOptimized = true
}) => {
  const datePickerRef = useRef<ReactDatePicker>(null);
  const { locale: systemLocale } = useLocale();
  const locale = propLocale || systemLocale;

  // Memoize date validation function
  const validateSelectedDate = useCallback((date: Date | null) => {
    if (!date) return required ? { isValid: false, error: 'Date is required' } : { isValid: true };
    
    const validation = validateDate(date, false, timezone);
    
    // Additional business hours validation
    if (validation.isValid) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      if (timeString < businessHours.start || timeString > businessHours.end) {
        return {
          isValid: false,
          error: `Please select a time between ${businessHours.start} and ${businessHours.end}`
        };
      }
    }

    return validation;
  }, [required, timezone, businessHours]);

  // Handle date change with validation
  const handleDateChange = useCallback((date: Date | null, event: React.SyntheticEvent) => {
    if (disabled) return;

    if (date) {
      const validation = validateSelectedDate(date);
      if (!validation.isValid) {
        // Announce error to screen readers
        const errorMessage = validation.error || 'Invalid date selected';
        datePickerRef.current?.setState({ 
          ariaLiveMessage: errorMessage 
        });
        return;
      }

      // Format date according to timezone
      const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
      onChange(tzDate);
    } else {
      onChange(null);
    }
  }, [disabled, onChange, timezone, validateSelectedDate]);

  // Handle blur event
  const handleBlur = useCallback(() => {
    if (value) {
      const validation = validateSelectedDate(value);
      if (!validation.isValid) {
        datePickerRef.current?.setState({ 
          ariaLiveMessage: validation.error || 'Invalid date' 
        });
      }
    }
    onBlur?.();
  }, [value, validateSelectedDate, onBlur]);

  // Memoize date picker props for performance
  const datePickerProps = useMemo(() => ({
    selected: value,
    onChange: handleDateChange,
    onBlur: handleBlur,
    minDate,
    maxDate,
    disabled,
    placeholderText: placeholder,
    dateFormat,
    locale,
    showTimeSelect: true,
    timeIntervals: 15,
    timeCaption: "Time",
    minTime: parseISO(`2000-01-01T${businessHours.start}`),
    maxTime: parseISO(`2000-01-01T${businessHours.end}`),
    calendarStartDay: 1, // Monday
    isClearable: !required,
    shouldCloseOnSelect: true,
    showPopperArrow: false,
    formatWeekDay: (nameOfDay: string) => nameOfDay.substring(0, 3),
    timeFormat: "HH:mm",
    withPortal: mobileOptimized && window.innerWidth < 768,
  }), [
    value,
    handleDateChange,
    handleBlur,
    minDate,
    maxDate,
    disabled,
    placeholder,
    dateFormat,
    locale,
    businessHours,
    required,
    mobileOptimized
  ]);

  // Accessibility attributes
  const ariaAttributes = {
    'aria-label': ariaLabel || `Date picker for ${name}`,
    'aria-invalid': error ? 'true' : 'false',
    'aria-required': required ? 'true' : 'false',
    'aria-describedby': error ? `${id}-error` : undefined,
  };

  return (
    <div className={classNames('date-picker-container', className)}>
      <ReactDatePicker
        {...datePickerProps}
        {...ariaAttributes}
        ref={datePickerRef}
        id={id}
        name={name}
        className={classNames('date-picker-input', {
          'date-picker-input--error': error,
          'date-picker-input--disabled': disabled
        })}
      />
      {error && (
        <div 
          id={`${id}-error`}
          className="date-picker-error"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
    </div>
  );
});

DatePicker.displayName = 'DatePicker';

export default DatePicker;