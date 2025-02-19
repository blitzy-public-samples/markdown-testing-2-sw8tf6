import React, { useRef, useEffect } from 'react';
import classNames from 'classnames'; // ^2.3.0
import '../../assets/styles/variables.css';

interface CheckboxProps {
  id: string;
  name: string;
  label?: string;
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  onChange?: (checked: boolean) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  id,
  name,
  label,
  checked = false,
  indeterminate = false,
  disabled = false,
  required = false,
  error,
  className,
  onChange,
  onFocus,
  onBlur,
  ariaLabel,
  ariaDescribedBy,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync indeterminate state with DOM
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const newChecked = event.target.checked;
    onChange?.(newChecked);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLLabelElement>) => {
    if (disabled) return;
    
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onChange?.(!checked);
    }
  };

  const checkboxClasses = classNames(
    'checkbox-container',
    {
      'checkbox--disabled': disabled,
      'checkbox--error': error,
      'checkbox--indeterminate': indeterminate,
    },
    className
  );

  const inputClasses = classNames(
    'checkbox-input',
    {
      'checkbox-input--checked': checked,
      'checkbox-input--indeterminate': indeterminate,
    }
  );

  return (
    <div className={checkboxClasses}>
      <label
        htmlFor={id}
        className="checkbox-label"
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
      >
        <input
          ref={inputRef}
          type="checkbox"
          id={id}
          name={name}
          checked={checked}
          disabled={disabled}
          required={required}
          onChange={handleChange}
          onFocus={onFocus}
          onBlur={onBlur}
          className={inputClasses}
          aria-checked={indeterminate ? 'mixed' : checked}
          aria-disabled={disabled}
          aria-invalid={!!error}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
        />
        <span className="checkbox-custom" aria-hidden="true" />
        {label && <span className="checkbox-text">{label}</span>}
      </label>
      {error && (
        <span className="checkbox-error" role="alert">
          {error}
        </span>
      )}
      <style jsx>{`
        .checkbox-container {
          display: inline-flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          position: relative;
        }

        .checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm);
          cursor: pointer;
          font-family: var(--font-family-primary);
          font-size: var(--font-size-md);
          line-height: var(--line-height-normal);
          color: inherit;
          user-select: none;
        }

        .checkbox--disabled .checkbox-label {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .checkbox-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .checkbox-custom {
          position: relative;
          display: inline-block;
          width: 18px;
          height: 18px;
          border: var(--border-width-thin) solid currentColor;
          border-radius: var(--border-radius-sm);
          background-color: transparent;
          transition: all var(--transition-fast);
        }

        .checkbox-input:checked + .checkbox-custom::after {
          content: '';
          position: absolute;
          left: 5px;
          top: 2px;
          width: 6px;
          height: 10px;
          border: solid currentColor;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .checkbox-input--indeterminate + .checkbox-custom::after {
          content: '';
          position: absolute;
          left: 3px;
          top: 7px;
          width: 10px;
          height: 2px;
          background-color: currentColor;
        }

        .checkbox-input:focus-visible + .checkbox-custom {
          outline: 2px solid var(--color-focus);
          outline-offset: 2px;
        }

        .checkbox--error .checkbox-custom {
          border-color: var(--color-error);
        }

        .checkbox-text {
          font-size: var(--font-size-md);
          line-height: var(--line-height-normal);
        }

        .checkbox-error {
          font-size: var(--font-size-sm);
          color: var(--color-error);
          margin-top: var(--spacing-xs);
        }

        @media (max-width: var(--breakpoint-sm)) {
          .checkbox-custom {
            width: 20px;
            height: 20px;
          }

          .checkbox-text {
            font-size: var(--font-size-lg);
          }
        }
      `}</style>
    </div>
  );
};

export default Checkbox;
export type { CheckboxProps };