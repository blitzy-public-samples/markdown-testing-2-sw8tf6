import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoginForm from '../../components/auth/LoginForm';
import MainLayout from '../../components/layout/MainLayout';
import { AuthResponse } from '../../interfaces/auth.interface';
import { ERROR_MESSAGES } from '../../constants/error.constants';
import { DEFAULT_REDIRECT } from '../../constants/routes.constants';

/**
 * Login page component with enhanced security features and accessibility
 * Implements secure authentication flow with MFA support
 */
const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, mfaRequired, error } = useAuth();
  const [loginStartTime, setLoginStartTime] = useState<number>(0);
  const [correlationId] = useState<string>(`login-${Date.now()}`);

  // Track performance metrics
  useEffect(() => {
    if (loginStartTime > 0) {
      const loginDuration = Date.now() - loginStartTime;
      // Log performance metric
      console.info(`Login attempt duration: ${loginDuration}ms`, {
        correlationId,
        timestamp: new Date().toISOString()
      });
    }
  }, [loginStartTime, correlationId]);

  // Redirect if already authenticated
  if (isAuthenticated && !mfaRequired) {
    return <Navigate to={DEFAULT_REDIRECT.AUTHENTICATED} replace />;
  }

  // Handle successful login
  const handleLoginSuccess = useCallback(async (response: AuthResponse) => {
    const loginDuration = Date.now() - loginStartTime;

    // Validate login duration against SLA
    if (loginDuration > 1000) {
      console.warn('Login duration exceeded SLA', {
        duration: loginDuration,
        correlationId,
        timestamp: new Date().toISOString()
      });
    }

    if (response.requiresMfa) {
      navigate('/auth/mfa-verify');
    } else {
      navigate(DEFAULT_REDIRECT.AUTHENTICATED);
    }
  }, [navigate, loginStartTime, correlationId]);

  // Handle login error with correlation tracking
  const handleLoginError = useCallback((error: Error & { correlationId?: string }) => {
    console.error('Login failed:', {
      error: error.message,
      correlationId: error.correlationId || correlationId,
      timestamp: new Date().toISOString()
    });
  }, [correlationId]);

  // Handle MFA requirement
  const handleMFARequired = useCallback((sessionToken: string) => {
    // Store temporary session token for MFA verification
    sessionStorage.setItem('mfa_session_token', sessionToken);
    navigate('/auth/mfa-verify');
  }, [navigate]);

  return (
    <MainLayout showSidebar={false}>
      <div 
        className="login-container"
        role="main"
        aria-labelledby="login-title"
      >
        <div className="login-content">
          <h1 
            id="login-title"
            className="login-title"
            tabIndex={-1}
          >
            Sign in to your account
          </h1>

          {error && (
            <div 
              role="alert"
              aria-live="polite"
              className="error-message"
            >
              {error.message || ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS}
            </div>
          )}

          <LoginForm
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
            onMfaRequired={handleMFARequired}
          />

          <div className="login-links">
            <a 
              href="/auth/forgot-password"
              className="forgot-password-link"
              aria-label="Forgot password? Reset it here"
            >
              Forgot password?
            </a>
            <a 
              href="/auth/register"
              className="register-link"
              aria-label="Don't have an account? Sign up here"
            >
              Create account
            </a>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

// Apply performance monitoring decorator
const withPerformanceMonitoring = (WrappedComponent: React.FC) => {
  return function PerformanceMonitoredComponent(props: any) {
    useEffect(() => {
      const startTime = performance.now();
      
      return () => {
        const duration = performance.now() - startTime;
        console.info(`Login page render duration: ${duration}ms`);
      };
    }, []);

    return <WrappedComponent {...props} />;
  };
};

export default withPerformanceMonitoring(LoginPage);