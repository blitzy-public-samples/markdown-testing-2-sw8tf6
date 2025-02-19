import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as ErrorTracker from '@sentry/browser';
import { Button } from '../../components/common/Button';
import MainLayout from '../../components/layout/MainLayout';
import styles from './Error500.module.css';

/**
 * Enhanced 500 error page component with error tracking, retry mechanism,
 * and accessibility features
 */
const Error500: React.FC = () => {
  const navigate = useNavigate();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Track error page view for monitoring
  useEffect(() => {
    ErrorTracker.captureMessage('500 Error Page Viewed', {
      level: 'error',
      extra: {
        timestamp: new Date().toISOString(),
        url: window.location.href
      }
    });

    // Performance monitoring
    const pageLoadTime = performance.now();
    return () => {
      ErrorTracker.addBreadcrumb({
        category: 'performance',
        message: 'Error page load time',
        data: {
          duration: performance.now() - pageLoadTime
        }
      });
    };
  }, []);

  /**
   * Enhanced retry handler with exponential backoff
   */
  const handleRetry = useCallback(async () => {
    if (retryCount >= MAX_RETRIES) {
      ErrorTracker.captureMessage('Max retry attempts reached', {
        level: 'warning'
      });
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      // Calculate exponential backoff delay
      const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));

      // Attempt to reload the application
      window.location.reload();
    } catch (error) {
      ErrorTracker.captureException(error);
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount]);

  /**
   * Enhanced dashboard navigation with state preservation
   */
  const handleDashboardNavigation = useCallback(() => {
    ErrorTracker.addBreadcrumb({
      category: 'navigation',
      message: 'User navigated to dashboard from 500 error page'
    });
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  return (
    <MainLayout>
      <div 
        className={styles.container}
        role="alert"
        aria-live="polite"
      >
        <div className={styles.content}>
          <h1 className={styles.title}>
            Internal Server Error
          </h1>
          
          <div className={styles.illustration}>
            <img
              src="/assets/images/500-error.svg"
              alt="Server Error Illustration"
              width={400}
              height={300}
              loading="eager"
            />
          </div>

          <p className={styles.message}>
            We're experiencing technical difficulties. Our team has been notified and is working to resolve the issue.
          </p>

          <div className={styles.actions}>
            <Button
              variant="primary"
              onClick={handleRetry}
              isLoading={isRetrying}
              isDisabled={retryCount >= MAX_RETRIES}
              aria-label={
                retryCount >= MAX_RETRIES
                  ? "Maximum retry attempts reached"
                  : "Retry current operation"
              }
            >
              {retryCount >= MAX_RETRIES ? "Too many attempts" : "Retry"}
            </Button>

            <Button
              variant="outline"
              onClick={handleDashboardNavigation}
              aria-label="Return to dashboard"
            >
              Return to Dashboard
            </Button>
          </div>

          {retryCount > 0 && (
            <p 
              className={styles.retryMessage}
              aria-live="polite"
            >
              Retry attempt {retryCount} of {MAX_RETRIES}
            </p>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Error500;