import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, ButtonProps } from '../../components/common/Button';
import { MainLayout } from '../../components/layout/MainLayout';
import { PROTECTED_ROUTES } from '../../constants/routes.constants';
import styles from './Error404.module.css';

/**
 * 404 Error Page Component
 * Displays a user-friendly error message when a route is not found
 * Implements accessibility features and keyboard navigation
 */
const Error404: React.FC = () => {
  const navigate = useNavigate();

  // Track error occurrence for analytics
  useEffect(() => {
    // Log 404 error for monitoring
    console.error('404 Error:', {
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
  }, []);

  // Handle return to dashboard with keyboard support
  const handleReturnHome = useCallback(() => {
    navigate(PROTECTED_ROUTES.DASHBOARD);
  }, [navigate]);

  // Handle keyboard shortcuts
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    // ESC key returns to dashboard
    if (event.key === 'Escape') {
      handleReturnHome();
    }
  }, [handleReturnHome]);

  // Setup keyboard listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardNavigation);
    return () => {
      document.removeEventListener('keydown', handleKeyboardNavigation);
    };
  }, [handleKeyboardNavigation]);

  return (
    <MainLayout>
      <div className={styles.container} role="main">
        <div className={styles.content}>
          <h1 className={styles.title} tabIndex={0}>
            404 - Page Not Found
          </h1>
          
          <div 
            className={styles.message} 
            role="alert" 
            aria-live="polite"
          >
            <p>The page you're looking for doesn't exist or has been moved.</p>
            <p>Please check the URL or return to the dashboard.</p>
          </div>

          <div className={styles.illustration} aria-hidden="true">
            {/* Error illustration or icon */}
            404
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleReturnHome}
            className={styles.button}
            aria-label="Return to dashboard"
            autoFocus
          >
            Return to Dashboard
          </Button>

          <div className={styles.helpText}>
            <p>
              Press <kbd>ESC</kbd> to return to dashboard
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

// CSS Module styles
const styles = {
  container: `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 64px);
    padding: var(--spacing-lg);
    background-color: var(--color-background);
  `,

  content: `
    max-width: var(--max-width-md);
    text-align: center;
    animation: fadeIn var(--transition-normal);

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,

  title: `
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin-bottom: var(--spacing-md);

    @media (max-width: var(--breakpoint-sm)) {
      font-size: var(--font-size-3xl);
    }
  `,

  message: `
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-xl);
    line-height: var(--line-height-relaxed);
  `,

  illustration: `
    font-size: 120px;
    color: var(--color-primary);
    margin-bottom: var(--spacing-xl);
    opacity: 0.5;
  `,

  button: `
    min-width: 200px;
    margin-bottom: var(--spacing-md);
  `,

  helpText: `
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);

    kbd {
      display: inline-block;
      padding: var(--spacing-xs) var(--spacing-sm);
      font-family: var(--font-family-mono);
      background-color: var(--color-background-alt);
      border-radius: var(--border-radius-sm);
      border: 1px solid var(--color-border);
    }
  `
} as const;

export default Error404;