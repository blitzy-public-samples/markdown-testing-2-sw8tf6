import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';

/**
 * ForgotPassword page component that handles password recovery functionality
 * Implements comprehensive security measures and accessibility features
 */
const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <MainLayout
      showSidebar={false}
      aria-labelledby="forgot-password-title"
    >
      <div
        className="auth-container"
        style={{
          maxWidth: 'var(--max-width-sm)',
          margin: '0 auto',
          padding: 'var(--spacing-lg)',
          marginTop: 'var(--spacing-2xl)'
        }}
      >
        <div
          role="main"
          aria-labelledby="forgot-password-title"
          style={{
            backgroundColor: 'var(--color-background)',
            borderRadius: 'var(--border-radius-lg)',
            padding: 'var(--spacing-xl)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <h1
            id="forgot-password-title"
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              marginBottom: 'var(--spacing-md)',
              color: 'var(--color-text-primary)'
            }}
          >
            Reset Password
          </h1>

          <p
            style={{
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--spacing-lg)',
              fontSize: 'var(--font-size-md)',
              lineHeight: 'var(--line-height-relaxed)'
            }}
          >
            Enter your email address and we'll send you instructions to reset your password.
          </p>

          <ForgotPasswordForm />

          <div
            style={{
              marginTop: 'var(--spacing-lg)',
              textAlign: 'center'
            }}
          >
            <button
              onClick={() => navigate('/auth/login')}
              className="link-button"
              style={{
                color: 'var(--color-primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--font-size-md)',
                padding: 'var(--spacing-xs)',
                transition: 'color var(--transition-normal)'
              }}
              aria-label="Return to login page"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ForgotPassword;