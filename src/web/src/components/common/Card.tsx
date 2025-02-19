import React, { useCallback, useMemo } from 'react';
import classNames from 'classnames';
import styles from './Card.module.css';

// Card Props Interface
export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  isInteractive?: boolean;
  theme?: 'light' | 'dark';
  ariaLabel?: string;
  ariaDescribedBy?: string;
  testId?: string;
}

// Custom hook for card interactions
const useCardInteraction = (
  isInteractive: boolean = false,
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void
) => {
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isInteractive || !onClick) return;
      
      if (event.key === 'Enter' || event.key === 'Space') {
        event.preventDefault();
        onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
      }
    },
    [isInteractive, onClick]
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isInteractive || !onClick) return;
      onClick(event);
    },
    [isInteractive, onClick]
  );

  return {
    handleKeyDown,
    handleClick,
    tabIndex: isInteractive ? 0 : undefined,
    role: isInteractive ? 'button' : 'article'
  };
};

// Card Component
export const Card: React.FC<CardProps> = React.memo(({
  children,
  variant = 'default',
  padding = 'md',
  className,
  onClick,
  isInteractive = false,
  theme = 'light',
  ariaLabel,
  ariaDescribedBy,
  testId
}) => {
  const {
    handleKeyDown,
    handleClick,
    tabIndex,
    role
  } = useCardInteraction(isInteractive, onClick);

  const cardClasses = useMemo(() => 
    classNames(
      styles.card,
      styles[`variant-${variant}`],
      styles[`padding-${padding}`],
      styles[`theme-${theme}`],
      {
        [styles.interactive]: isInteractive,
      },
      className
    ),
    [variant, padding, theme, isInteractive, className]
  );

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={tabIndex}
      role={role}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      data-testid={testId}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

// CSS Module
const styles = {
  card: `
    position: relative;
    width: 100%;
    border-radius: var(--border-radius-lg);
    transition: 
      box-shadow var(--transition-normal),
      transform var(--transition-fast);
    content-visibility: auto;
    contain: content;
    will-change: transform, box-shadow;
  `,
  'variant-default': `
    background: var(--color-background);
    border: var(--border-width-thin) solid var(--color-border);
  `,
  'variant-elevated': `
    background: var(--color-background);
    box-shadow: var(--shadow-md);
  `,
  'variant-outlined': `
    background: transparent;
    border: var(--border-width-thin) solid var(--color-border);
  `,
  'padding-none': `
    padding: 0;
  `,
  'padding-sm': `
    padding: var(--spacing-sm);
  `,
  'padding-md': `
    padding: var(--spacing-md);
  `,
  'padding-lg': `
    padding: var(--spacing-lg);
  `,
  'theme-light': `
    --color-background: #ffffff;
    --color-border: rgba(0, 0, 0, 0.12);
  `,
  'theme-dark': `
    --color-background: #1a1a1a;
    --color-border: rgba(255, 255, 255, 0.12);
  `,
  interactive: `
    cursor: pointer;
    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
    &:focus-visible {
      outline: var(--border-width-medium) solid var(--color-primary);
      outline-offset: 2px;
    }
    &:active {
      transform: translateY(0);
      box-shadow: var(--shadow-md);
    }
  `
} as const;

export default Card;