import React, { forwardRef } from 'react';
import classNames from 'classnames';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Content to be rendered inside the button */
  children: React.ReactNode;
  /** Visual style variant of the button */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /** Size variant of the button */
  size?: 'sm' | 'md' | 'lg';
  /** Loading state - shows spinner and prevents interaction */
  isLoading?: boolean;
  /** Disabled state - prevents interaction */
  isDisabled?: boolean;
  /** Makes the button fill its container width */
  fullWidth?: boolean;
  /** HTML button type */
  type?: 'button' | 'submit' | 'reset';
  /** Optional icon to show at the start of the button */
  startIcon?: React.ReactElement;
  /** Optional icon to show at the end of the button */
  endIcon?: React.ReactElement;
  /** Position of the icon when only one icon is present */
  iconPosition?: 'start' | 'end';
  /** Additional CSS classes */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isDisabled = false,
  fullWidth = false,
  type = 'button',
  startIcon,
  endIcon,
  iconPosition = 'start',
  className,
  ariaLabel,
  onClick,
  ...props
}, ref) => {
  // Combine base styles with variants and states
  const buttonClasses = classNames(
    styles.button,
    styles[`button--${variant}`],
    styles[`button--${size}`],
    {
      [styles['button--loading']]: isLoading,
      [styles['button--disabled']]: isDisabled,
      [styles['button--full-width']]: fullWidth,
      [styles['button--with-start-icon']]: startIcon,
      [styles['button--with-end-icon']]: endIcon,
    },
    className
  );

  // Handle click events when button is not disabled or loading
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled || isLoading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={isDisabled || isLoading}
      aria-disabled={isDisabled || isLoading}
      aria-busy={isLoading}
      aria-label={ariaLabel}
      {...props}
    >
      {isLoading && (
        <span className={styles['loading-spinner']} aria-hidden="true">
          <svg viewBox="0 0 24 24" className={styles['spinner-icon']}>
            <circle cx="12" cy="12" r="10" fill="none" strokeWidth="3" />
          </svg>
        </span>
      )}
      
      {startIcon && !isLoading && (
        <span className={styles['button__icon-start']} aria-hidden="true">
          {startIcon}
        </span>
      )}
      
      <span className={styles['button__content']}>
        {children}
      </span>
      
      {endIcon && !isLoading && (
        <span className={styles['button__icon-end']} aria-hidden="true">
          {endIcon}
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

// CSS Module styles
const styles = {
  button: `
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    font-family: var(--font-family-primary);
    font-weight: var(--font-weight-medium);
    border-radius: var(--border-radius-md);
    transition: all var(--transition-normal);
    cursor: pointer;
    outline: none;
    white-space: nowrap;
    text-decoration: none;
    
    &:focus-visible {
      outline: var(--border-width-medium) solid var(--color-focus-ring);
      outline-offset: 2px;
    }
    
    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  `,

  // Size variants
  'button--sm': `
    height: 32px;
    padding: 0 var(--spacing-md);
    font-size: var(--font-size-sm);
  `,
  
  'button--md': `
    height: 40px;
    padding: 0 var(--spacing-lg);
    font-size: var(--font-size-md);
  `,
  
  'button--lg': `
    height: 48px;
    padding: 0 var(--spacing-xl);
    font-size: var(--font-size-lg);
  `,

  // Style variants
  'button--primary': `
    background-color: var(--color-primary);
    color: var(--color-white);
    border: none;
    
    &:hover:not(:disabled) {
      background-color: var(--color-primary-dark);
    }
    
    &:active:not(:disabled) {
      background-color: var(--color-primary-darker);
    }
  `,

  'button--secondary': `
    background-color: var(--color-secondary);
    color: var(--color-white);
    border: none;
    
    &:hover:not(:disabled) {
      background-color: var(--color-secondary-dark);
    }
    
    &:active:not(:disabled) {
      background-color: var(--color-secondary-darker);
    }
  `,

  'button--outline': `
    background-color: transparent;
    color: var(--color-primary);
    border: var(--border-width-thin) solid var(--color-primary);
    
    &:hover:not(:disabled) {
      background-color: var(--color-primary-light);
    }
    
    &:active:not(:disabled) {
      background-color: var(--color-primary-lighter);
    }
  `,

  'button--ghost': `
    background-color: transparent;
    color: var(--color-text-primary);
    border: none;
    
    &:hover:not(:disabled) {
      background-color: var(--color-background-hover);
    }
    
    &:active:not(:disabled) {
      background-color: var(--color-background-active);
    }
  `,

  // State modifiers
  'button--loading': `
    cursor: wait;
    
    .button__content {
      opacity: 0;
    }
  `,

  'button--full-width': `
    width: 100%;
  `,

  // Icon styles
  'button__icon-start': `
    display: inline-flex;
    align-items: center;
    margin-right: var(--spacing-xs);
  `,

  'button__icon-end': `
    display: inline-flex;
    align-items: center;
    margin-left: var(--spacing-xs);
  `,

  'loading-spinner': `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  `,

  'spinner-icon': `
    width: 24px;
    height: 24px;
    animation: spin 1s linear infinite;
    stroke: currentColor;
    
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `,

  'button__content': `
    display: inline-flex;
    align-items: center;
    justify-content: center;
  `,
} as const;