import React, { memo, useCallback } from 'react';
import { useSelector } from 'react-redux'; // v8.1.0
import classnames from 'classnames'; // v2.3.0
import { selectUnreadCount } from '../../store/notification/notification.selectors';
import { Button } from '../common/Button';
import styles from './NotificationBadge.module.css';

export interface NotificationBadgeProps {
  /** Handler for badge click */
  onBadgeClick: () => void;
  /** Size variant of the badge */
  size?: 'small' | 'medium' | 'large';
  /** Theme variant */
  theme?: 'light' | 'dark';
  /** Additional CSS classes */
  className?: string;
}

/**
 * A notification badge component that displays unread notification count
 * Features real-time updates, animations, and accessibility support
 */
export const NotificationBadge = memo<NotificationBadgeProps>(({
  onBadgeClick,
  size = 'medium',
  theme = 'light',
  className
}) => {
  // Get unread count from Redux store with automatic memoization
  const unreadCount = useSelector(selectUnreadCount);

  // Memoized click handler
  const handleClick = useCallback(() => {
    if (unreadCount > 0) {
      onBadgeClick();
    }
  }, [unreadCount, onBadgeClick]);

  // Determine if badge should be visible
  const isVisible = unreadCount > 0;

  // Compute badge classes
  const badgeClasses = classnames(
    styles.badge,
    styles[`badge--${size}`],
    styles[`badge--${theme}`],
    {
      [styles['badge--visible']]: isVisible,
      [styles['badge--pulse']]: isVisible && unreadCount > 0,
    },
    className
  );

  // Format count for display
  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <Button
      variant="ghost"
      size={size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'md'}
      className={styles.container}
      onClick={handleClick}
      aria-label={`${unreadCount} unread notifications`}
      aria-live="polite"
      aria-atomic="true"
      data-testid="notification-badge"
    >
      <div 
        className={badgeClasses}
        aria-hidden="true"
      >
        {isVisible && (
          <span className={styles.count}>
            {displayCount}
          </span>
        )}
      </div>
    </Button>
  );
});

NotificationBadge.displayName = 'NotificationBadge';

// CSS Module styles
const styles = {
  container: `
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  `,

  badge: `
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: var(--badge-size);
    height: var(--badge-size);
    padding: 0 var(--spacing-xs);
    border-radius: var(--border-radius-full);
    font-family: var(--font-family-primary);
    font-weight: var(--font-weight-medium);
    font-size: var(--badge-font-size);
    line-height: 1;
    transform: translate(50%, -50%) scale(0);
    transition: transform var(--transition-normal);
    pointer-events: none;
  `,

  'badge--visible': `
    transform: translate(50%, -50%) scale(1);
  `,

  'badge--small': `
    --badge-size: 16px;
    --badge-font-size: var(--font-size-xs);
  `,

  'badge--medium': `
    --badge-size: 20px;
    --badge-font-size: var(--font-size-sm);
  `,

  'badge--large': `
    --badge-size: 24px;
    --badge-font-size: var(--font-size-md);
  `,

  'badge--light': `
    background-color: var(--color-error);
    color: var(--color-white);
  `,

  'badge--dark': `
    background-color: var(--color-error-dark);
    color: var(--color-white);
  `,

  'badge--pulse': `
    animation: pulse 2s infinite;

    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(var(--color-error-rgb), 0.4);
      }
      70% {
        box-shadow: 0 0 0 6px rgba(var(--color-error-rgb), 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(var(--color-error-rgb), 0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `,

  count: `
    display: inline-block;
    min-width: 1ch;
    text-align: center;
  `
} as const;