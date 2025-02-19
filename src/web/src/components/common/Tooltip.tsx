import React, { useState, useEffect, useCallback, useRef } from 'react';
import classnames from 'classnames'; // v2.x
import { visually-hidden } from '../../assets/styles/global.css';

// Types and interfaces
interface Position {
  top: string;
  left: string;
  placement: TooltipPlacement;
}

type TooltipPlacement = 'top' | 'right' | 'bottom' | 'left';

interface TooltipProps {
  /** Content to display in the tooltip */
  content: string | React.ReactNode;
  /** Element that triggers the tooltip */
  children: React.ReactNode;
  /** Preferred placement of the tooltip */
  placement?: TooltipPlacement;
  /** Delay before showing/hiding tooltip (ms) */
  delay?: number;
  /** Custom offset from trigger element */
  offset?: { x: number; y: number };
  /** Additional CSS classes */
  className?: string;
  /** Theme variant */
  theme?: 'light' | 'dark';
  /** Unique identifier for ARIA purposes */
  id?: string;
}

// Default offset values
const DEFAULT_OFFSET = { x: 0, y: 8 };
const DEFAULT_DELAY = 200;

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  delay = DEFAULT_DELAY,
  offset = DEFAULT_OFFSET,
  className,
  theme = 'light',
  id,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ top: '0', left: '0', placement });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout>();
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate optimal tooltip position
  const calculatePosition = useCallback((): Position => {
    if (!triggerRef.current || !tooltipRef.current) {
      return { top: '0', left: '0', placement };
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let finalPlacement = placement;
    let top = '0';
    let left = '0';

    // Calculate initial position based on preferred placement
    switch (placement) {
      case 'top':
        top = `${triggerRect.top - tooltipRect.height - offset.y}px`;
        left = `${triggerRect.left + (triggerRect.width - tooltipRect.width) / 2}px`;
        break;
      case 'bottom':
        top = `${triggerRect.bottom + offset.y}px`;
        left = `${triggerRect.left + (triggerRect.width - tooltipRect.width) / 2}px`;
        break;
      case 'left':
        top = `${triggerRect.top + (triggerRect.height - tooltipRect.height) / 2}px`;
        left = `${triggerRect.left - tooltipRect.width - offset.x}px`;
        break;
      case 'right':
        top = `${triggerRect.top + (triggerRect.height - tooltipRect.height) / 2}px`;
        left = `${triggerRect.right + offset.x}px`;
        break;
    }

    // Flip placement if tooltip would overflow viewport
    const tooltipPos = {
      top: parseFloat(top),
      left: parseFloat(left),
    };

    if (tooltipPos.left < 0) {
      finalPlacement = 'right';
      left = `${triggerRect.right + offset.x}px`;
    } else if (tooltipPos.left + tooltipRect.width > viewportWidth) {
      finalPlacement = 'left';
      left = `${triggerRect.left - tooltipRect.width - offset.x}px`;
    }

    if (tooltipPos.top < 0) {
      finalPlacement = 'bottom';
      top = `${triggerRect.bottom + offset.y}px`;
    } else if (tooltipPos.top + tooltipRect.height > viewportHeight) {
      finalPlacement = 'top';
      top = `${triggerRect.top - tooltipRect.height - offset.y}px`;
    }

    return { top, left, placement: finalPlacement };
  }, [placement, offset]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isVisible) {
      setIsVisible(false);
    }
  }, [isVisible]);

  // Show tooltip with delay
  const showTooltip = useCallback(() => {
    clearTimeout(hideTimeoutRef.current);
    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      setPosition(calculatePosition());
    }, delay);
  }, [delay, calculatePosition]);

  // Hide tooltip with delay
  const hideTooltip = useCallback(() => {
    clearTimeout(showTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, delay);
  }, [delay]);

  // Setup event listeners and cleanup
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
      clearTimeout(showTimeoutRef.current);
      clearTimeout(hideTimeoutRef.current);
    };
  }, [handleKeyDown, calculatePosition]);

  // Update position when content changes
  useEffect(() => {
    if (isVisible) {
      setPosition(calculatePosition());
    }
  }, [content, isVisible, calculatePosition]);

  const tooltipId = id || `tooltip-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div
      ref={triggerRef}
      className="tooltip-trigger"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      aria-describedby={tooltipId}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={classnames(
            'tooltip',
            `tooltip--${position.placement}`,
            `tooltip--${theme}`,
            className,
            'hardware-accelerated'
          )}
          style={{
            top: position.top,
            left: position.left,
            position: 'fixed',
            zIndex: 'var(--z-index-tooltip)',
          }}
          aria-hidden={!isVisible}
        >
          {content}
          <span className={visually-hidden}>
            {typeof content === 'string' ? content : 'Tooltip content'}
          </span>
        </div>
      )}
    </div>
  );
};

export default Tooltip;