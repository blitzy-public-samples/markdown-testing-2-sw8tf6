import React, { useState, useRef, useCallback, useEffect } from 'react';
import classNames from 'classnames'; // v2.x
import { debounce } from 'lodash'; // v4.x
import { validateRequired, validateLength } from '../../utils/validation.util';

interface TextAreaProps {
  id: string;
  name: string;
  value: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  rows?: number;
  disabled?: boolean;
  error?: string;
  onChange: (value: string) => void;
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  'aria-label'?: string;
  showCharacterCount?: boolean;
  autoResize?: boolean;
  customValidation?: (value: string) => { isValid: boolean; error?: string };
  locale?: string;
  rtl?: boolean;
}

const TextArea: React.FC<TextAreaProps> = ({
  id,
  name,
  value,
  placeholder,
  className,
  required = false,
  minLength,
  maxLength,
  rows = 3,
  disabled = false,
  error,
  onChange,
  onBlur,
  'aria-label': ariaLabel,
  showCharacterCount = false,
  autoResize = false,
  customValidation,
  locale = 'en',
  rtl = false,
}) => {
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState<string | undefined>(error);
  const [characterCount, setCharacterCount] = useState(value.length);
  const [isResizing, setIsResizing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Validation function
  const validateInput = useCallback((inputValue: string) => {
    if (required) {
      const requiredValidation = validateRequired(inputValue, name);
      if (!requiredValidation.isValid) {
        setInternalError(requiredValidation.error);
        return;
      }
    }

    if (minLength !== undefined || maxLength !== undefined) {
      const lengthValidation = validateLength(
        inputValue,
        minLength || 0,
        maxLength || Number.MAX_SAFE_INTEGER,
        name
      );
      if (!lengthValidation.isValid) {
        setInternalError(lengthValidation.error);
        return;
      }
    }

    if (customValidation) {
      const customResult = customValidation(inputValue);
      if (!customResult.isValid) {
        setInternalError(customResult.error);
        return;
      }
    }

    setInternalError(undefined);
  }, [required, minLength, maxLength, name, customValidation]);

  // Debounced validation
  const debouncedValidation = useCallback(
    debounce((value: string) => validateInput(value), 300),
    [validateInput]
  );

  // Auto-resize handler
  const handleResize = useCallback(() => {
    if (!autoResize || !textareaRef.current) return;

    setIsResizing(true);
    const textarea = textareaRef.current;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    
    // Reset resizing state after animation
    setTimeout(() => setIsResizing(false), 200);
  }, [autoResize]);

  // Change handler
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    setCharacterCount(newValue.length);
    
    if (maxLength && newValue.length > maxLength) return;
    
    onChange(newValue);
    debouncedValidation(newValue);
    
    if (autoResize) {
      handleResize();
    }
  };

  // Blur handler
  const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    setTouched(true);
    validateInput(event.target.value);
    onBlur?.(event);
  };

  // Update error state when prop changes
  useEffect(() => {
    setInternalError(error);
  }, [error]);

  // Initial resize
  useEffect(() => {
    if (autoResize) {
      handleResize();
    }
  }, [autoResize, handleResize]);

  const textareaClasses = classNames(
    'textarea',
    className,
    {
      'textarea--error': touched && internalError,
      'textarea--disabled': disabled,
      'textarea--resizing': isResizing,
      'textarea--rtl': rtl,
    }
  );

  return (
    <div className="textarea-container">
      <textarea
        ref={textareaRef}
        id={id}
        name={name}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={textareaClasses}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        maxLength={maxLength}
        aria-label={ariaLabel || name}
        aria-invalid={touched && !!internalError}
        aria-required={required}
        aria-errormessage={internalError ? `${id}-error` : undefined}
        dir={rtl ? 'rtl' : 'ltr'}
        lang={locale}
        data-testid={`textarea-${id}`}
      />
      
      {touched && internalError && (
        <div 
          className="textarea-error" 
          id={`${id}-error`}
          role="alert"
          aria-live="polite"
        >
          {internalError}
        </div>
      )}
      
      {showCharacterCount && (
        <div 
          className="textarea-character-count"
          aria-live="polite"
          aria-atomic="true"
        >
          {maxLength 
            ? `${characterCount}/${maxLength}`
            : `${characterCount} characters`
          }
        </div>
      )}
    </div>
  );
};

export default TextArea;