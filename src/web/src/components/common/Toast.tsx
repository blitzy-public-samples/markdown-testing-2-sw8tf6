import React, { useEffect, useRef, useCallback, useState, memo } from 'react';
import classnames from 'classnames';
import { ERROR_SEVERITY_LEVELS, ERROR_DISPLAY_DURATION } from '../../constants/error.constants';
import { AppError } from '../../utils/error.util';

interface ToastProps {
  message: string;
  severity: typeof ERROR_SEVERITY_LEVELS[keyof typeof ERROR_SEVERITY_LEVELS];
  duration?: number;
  onClose: () => void;
}

/**
 * Generates CSS classes for the toast based on severity and state
 */
const getToastClasses = (
  severity: typeof ERROR_SEVERITY_LEVELS[keyof typeof ERROR_SEVERITY_LEVELS],
  isVisible: boolean,
  isPaused: boolean
): string => {
  return classnames(
    'toast',
    `toast--${severity}`,
    {
      'toast--visible': isVisible,
      'toast--hidden': !isVisible,
      'toast--paused': isPaused
    }
  );
};

/**
 * Toast component for displaying temporary notification messages
 * with enhanced accessibility and animation features
 */
const Toast: React.FC<ToastProps> = memo(({
  message,
  severity,
  duration = ERROR_DISPLAY_DURATION,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);
  const toastRef = useRef<HTMLDivElement>(null);

  /**
   * Handles the toast dismissal with cleanup
   */
  const handleClose = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Remove focus if toast is focused
    if (document.activeElement === toastRef.current) {
      (document.activeElement as HTMLElement).blur();
    }
    
    setIsVisible(false);
    
    // Allow time for exit animation before calling onClose
    setTimeout(onClose, 300);
  }, [onClose]);

  /**
   * Starts or resumes the auto-dismiss timer
   */
  const startDismissTimer = useCallback((timeRemaining: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    startTimeRef.current = Date.now();
    remainingTimeRef.current = timeRemaining;
    
    timeoutRef.current = setTimeout(handleClose, timeRemaining);
  }, [handleClose]);

  /**
   * Pauses the dismiss timer on hover/focus
   */
  const pauseTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      const elapsedTime = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsedTime);
    }
    setIsPaused(true);
  }, []);

  /**
   * Resumes the dismiss timer after hover/focus
   */
  const resumeTimer = useCallback(() => {
    setIsPaused(false);
    startDismissTimer(remainingTimeRef.current);
  }, [startDismissTimer]);

  // Initialize dismiss timer
  useEffect(() => {
    startDismissTimer(duration);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [duration, startDismissTimer]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleClose]);

  return (
    <div
      ref={toastRef}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      tabIndex={0}
      className={getToastClasses(severity, isVisible, isPaused)}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onFocus={pauseTimer}
      onBlur={resumeTimer}
    >
      <div className="toast__content">
        <span className="toast__icon" aria-hidden="true" />
        <span className="toast__message">{message}</span>
        <button
          type="button"
          className="toast__close"
          aria-label="Close notification"
          onClick={handleClose}
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      {isPaused ? null : (
        <div 
          className="toast__progress" 
          style={{ 
            animationDuration: `${duration}ms`,
            animationPlayState: isPaused ? 'paused' : 'running'
          }} 
        />
      )}
    </div>
  );
});

Toast.displayName = 'Toast';

export default Toast;