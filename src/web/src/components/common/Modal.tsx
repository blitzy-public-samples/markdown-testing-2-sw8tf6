import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { Button } from './Button';
import styles from './Modal.module.css';

export interface ModalProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Callback function when modal should close */
  onClose: () => void;
  /** Modal title for accessibility and header */
  title: string;
  /** Modal content */
  children: React.ReactNode;
  /** Modal size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Allow closing by clicking overlay */
  closeOnOverlayClick?: boolean;
  /** Show close button in header */
  showCloseButton?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Animation duration in milliseconds */
  animationDuration?: number;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
  className,
  animationDuration = 250,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the element that had focus before modal opened
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Handle escape key press
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (
      closeOnOverlayClick &&
      event.target === event.currentTarget
    ) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // Focus trap implementation
  const useFocusTrap = useCallback(() => {
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements?.length) return;

    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    firstFocusable.focus();

    return () => document.removeEventListener('keydown', handleTabKey);
  }, []);

  // Setup and cleanup effects
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
      setIsAnimating(true);
      
      const cleanup = useFocusTrap();
      
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = '';
        if (cleanup) cleanup();
      };
    }
  }, [isOpen, handleEscapeKey, useFocusTrap]);

  // Handle closing animation
  useEffect(() => {
    if (!isOpen && previousFocusRef.current) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
        previousFocusRef.current?.focus();
      }, animationDuration);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, animationDuration]);

  // Early return if modal is not open and not animating
  if (!isOpen && !isAnimating) return null;

  const modalContent = (
    <div
      className={classNames(
        styles.overlay,
        {
          [styles.overlayOpen]: isOpen,
          [styles.overlayClosing]: !isOpen && isAnimating,
        }
      )}
      onClick={handleOverlayClick}
      aria-hidden={!isOpen}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        className={classNames(
          styles.modal,
          styles[`modal--${size}`],
          {
            [styles.modalOpen]: isOpen,
            [styles.modalClosing]: !isOpen && isAnimating,
          },
          className
        )}
        style={{ '--animation-duration': `${animationDuration}ms` } as React.CSSProperties}
      >
        <header className={styles.header}>
          <h2 id="modal-title" className={styles.title}>
            {title}
          </h2>
          {showCloseButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close modal"
              className={styles.closeButton}
            >
              ×
            </Button>
          )}
        </header>
        
        <div id="modal-description" className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(
    modalContent,
    document.getElementById('modal-root') || document.body
  );
};

// CSS Module styles
const styles = {
  overlay: `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-index-modal-backdrop);
    opacity: 0;
    transition: opacity var(--transition-normal);
  `,

  overlayOpen: `
    opacity: 1;
  `,

  overlayClosing: `
    opacity: 0;
  `,

  modal: `
    background: var(--color-background);
    border-radius: var(--border-radius-lg);
    box-shadow: var(--shadow-xl);
    max-height: calc(100vh - var(--spacing-2xl));
    margin: var(--spacing-md);
    opacity: 0;
    transform: scale(0.95);
    transition: all var(--transition-normal);
    overflow: hidden;
    position: relative;
    
    @media (max-width: var(--breakpoint-sm)) {
      width: calc(100% - var(--spacing-md) * 2);
      margin: var(--spacing-sm);
    }
  `,

  'modal--sm': `
    width: 100%;
    max-width: var(--max-width-sm);
  `,

  'modal--md': `
    width: 100%;
    max-width: var(--max-width-md);
  `,

  'modal--lg': `
    width: 100%;
    max-width: var(--max-width-lg);
  `,

  modalOpen: `
    opacity: 1;
    transform: scale(1);
  `,

  modalClosing: `
    opacity: 0;
    transform: scale(0.95);
  `,

  header: `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: var(--border-width-thin) solid var(--color-border);
  `,

  title: `
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  `,

  closeButton: `
    font-size: var(--font-size-xl);
    line-height: 1;
    padding: var(--spacing-xs);
  `,

  content: `
    padding: var(--spacing-lg);
    overflow-y: auto;
    max-height: calc(100vh - var(--spacing-2xl) * 2);
  `,
} as const;