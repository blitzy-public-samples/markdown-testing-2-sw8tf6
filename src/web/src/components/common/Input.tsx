import React, { useState, useCallback, useRef, useEffect } from 'react';
import classNames from 'classnames';
import { validateRequired, validateEmail, validateLength, ValidationResult } from '../../utils/validation.util';

interface InputProps {
  id: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date';
  value: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  onChange?: (value: string, isValid: boolean) => void;
  onBlur?: (value: string, isValid: boolean) => void;
  validation?: ValidationOptions;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  rtl?: boolean;
  minLength?: number;
  maxLength?: number;
}

interface ValidationOptions {
  required?: boolean;
  type?: 'email' | 'length' | 'password' | 'custom';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: string) => ValidationResult;
  asyncValidator?: (value: string) => Promise<ValidationResult>;
}

interface ValidationState extends ValidationResult {
  isPending: boolean;
}

const Input: React.FC<InputProps> = ({
  id,
  name,
  type = 'text',
  value,
  placeholder,
  required = false,
  disabled = false,
  className,
  error,
  onChange,
  onBlur,
  validation,
  ariaLabel,
  ariaDescribedBy,
  rtl = false,
  minLength,
  maxLength,
}) => {
  const [touched, setTouched] = useState(false);
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: true,
    isPending: false,
  });
  const [internalValue, setInternalValue] = useState(value);
  const validationTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = `${id}-error`;

  // Validation function that combines all validation rules
  const validateInput = useCallback(async (inputValue: string): Promise<ValidationState> => {
    let result: ValidationResult = { isValid: true };
    
    // Required field validation
    if (required || validation?.required) {
      result = validateRequired(inputValue, name);
      if (!result.isValid) return { ...result, isPending: false };
    }

    if (!inputValue) return { isValid: true, isPending: false };

    // Type-specific validation
    if (validation?.type === 'email' || type === 'email') {
      result = validateEmail(inputValue);
    } else if (validation?.type === 'length' || minLength || maxLength) {
      result = validateLength(
        inputValue,
        minLength || validation?.minLength || 0,
        maxLength || validation?.maxLength || Number.MAX_SAFE_INTEGER,
        name
      );
    }

    // Pattern validation
    if (validation?.pattern && !validation.pattern.test(inputValue)) {
      result = {
        isValid: false,
        error: `Invalid ${name} format`,
        aria: { 'aria-invalid': 'true' }
      };
    }

    // Custom validation
    if (validation?.customValidator) {
      result = validation.customValidator(inputValue);
    }

    // Async validation
    if (validation?.asyncValidator) {
      try {
        return { ...(await validation.asyncValidator(inputValue)), isPending: false };
      } catch (error) {
        return {
          isValid: false,
          error: `Validation failed: ${error.message}`,
          isPending: false,
          aria: { 'aria-invalid': 'true' }
        };
      }
    }

    return { ...result, isPending: false };
  }, [required, validation, type, name, minLength, maxLength]);

  // Debounced change handler
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInternalValue(newValue);

    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    setValidationState(prev => ({ ...prev, isPending: true }));

    validationTimeoutRef.current = setTimeout(async () => {
      const validationResult = await validateInput(newValue);
      setValidationState(validationResult);
      onChange?.(newValue, validationResult.isValid);
    }, 300);
  }, [validateInput, onChange]);

  // Blur handler
  const handleBlur = useCallback(async (event: React.FocusEvent<HTMLInputElement>) => {
    setTouched(true);
    const validationResult = await validateInput(event.target.value);
    setValidationState(validationResult);
    onBlur?.(event.target.value, validationResult.isValid);
  }, [validateInput, onBlur]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  // Update internal value when prop value changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const inputClasses = classNames(
    'input',
    className,
    {
      'input--error': (touched && !validationState.isValid) || error,
      'input--disabled': disabled,
      'input--rtl': rtl,
      'input--pending': validationState.isPending
    }
  );

  const displayError = touched && (error || validationState.error);

  return (
    <div className="input-wrapper">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type={type}
        value={internalValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        className={inputClasses}
        aria-label={ariaLabel}
        aria-invalid={!validationState.isValid}
        aria-required={required}
        aria-describedby={classNames(ariaDescribedBy, { [errorId]: displayError })}
        aria-busy={validationState.isPending}
        dir={rtl ? 'rtl' : 'ltr'}
        {...validationState.aria}
        {...(minLength && { minLength })}
        {...(maxLength && { maxLength })}
      />
      {displayError && (
        <div
          id={errorId}
          className="input-error"
          role="alert"
          aria-live="polite"
        >
          {error || validationState.error}
        </div>
      )}
    </div>
  );
};

export default Input;