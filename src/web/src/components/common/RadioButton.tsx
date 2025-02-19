import React from 'react'; // ^18.0.0
import classNames from 'classnames'; // ^2.3.0
import '../../assets/styles/variables.css';
import styles from './RadioButton.module.css';

interface RadioButtonProps {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  label: string;
  disabled?: boolean;
  error?: boolean;
  helpText?: string;
  theme?: 'light' | 'dark';
  className?: string;
  onChange: (value: string) => void;
}

export const RadioButton: React.FC<RadioButtonProps> = ({
  id,
  name,
  value,
  checked,
  label,
  disabled = false,
  error = false,
  helpText,
  theme = 'light',
  className,
  onChange,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    event.preventDefault();
    if (!disabled) {
      const newValue = event.target.value;
      onChange(newValue);
    }
  };

  const radioClasses = classNames(
    styles.radioContainer,
    styles[theme],
    {
      [styles.disabled]: disabled,
      [styles.error]: error,
    },
    className
  );

  const inputClasses = classNames(styles.radioInput, {
    [styles.checked]: checked,
  });

  const labelClasses = classNames(styles.label, {
    [styles.labelDisabled]: disabled,
  });

  const helpTextId = helpText ? `${id}-help` : undefined;

  return (
    <div className={radioClasses}>
      <div className={styles.inputWrapper}>
        <input
          id={id}
          type="radio"
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          className={inputClasses}
          aria-checked={checked}
          aria-disabled={disabled}
          aria-describedby={helpTextId}
          aria-invalid={error}
        />
        <label htmlFor={id} className={labelClasses}>
          {label}
        </label>
      </div>
      {helpText && (
        <span id={helpTextId} className={styles.helpText}>
          {helpText}
        </span>
      )}
    </div>
  );
};

// CSS Module definition
declare module '*.css' {
  const styles: { [key: string]: string };
  export default styles;
}

// Default export for easier imports
export default RadioButton;

// Styles (RadioButton.module.css content)
const styles = {
  radioContainer: `
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    position: relative;
  `,
  
  inputWrapper: `
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  `,
  
  radioInput: `
    appearance: none;
    width: 20px;
    height: 20px;
    border: var(--border-width-medium) solid var(--color-primary);
    border-radius: var(--border-radius-full);
    background-color: var(--color-background);
    cursor: pointer;
    transition: all var(--transition-fast);
    position: relative;
    
    &:checked {
      &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 10px;
        height: 10px;
        border-radius: var(--border-radius-full);
        background-color: var(--color-primary);
      }
    }
    
    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-primary-light);
    }
    
    &:hover:not(:disabled) {
      border-color: var(--color-primary-dark);
    }
  `,
  
  label: `
    font-family: var(--font-family-primary);
    font-size: var(--font-size-md);
    color: var(--color-text);
    cursor: pointer;
  `,
  
  helpText: `
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin-left: 28px;
  `,
  
  disabled: `
    opacity: 0.5;
    cursor: not-allowed;
    
    & .radioInput {
      cursor: not-allowed;
    }
    
    & .label {
      cursor: not-allowed;
    }
  `,
  
  error: `
    & .radioInput {
      border-color: var(--color-error);
      
      &:focus-visible {
        box-shadow: 0 0 0 2px var(--color-error-light);
      }
    }
    
    & .helpText {
      color: var(--color-error);
    }
  `,
  
  light: `
    --color-background: #ffffff;
    --color-text: #1a1a1a;
    --color-text-secondary: #666666;
    --color-primary: #0066cc;
    --color-primary-dark: #004d99;
    --color-primary-light: rgba(0, 102, 204, 0.2);
    --color-error: #dc2626;
    --color-error-light: rgba(220, 38, 38, 0.2);
  `,
  
  dark: `
    --color-background: #1a1a1a;
    --color-text: #ffffff;
    --color-text-secondary: #a3a3a3;
    --color-primary: #3b82f6;
    --color-primary-dark: #2563eb;
    --color-primary-light: rgba(59, 130, 246, 0.2);
    --color-error: #ef4444;
    --color-error-light: rgba(239, 68, 68, 0.2);
  `,
};