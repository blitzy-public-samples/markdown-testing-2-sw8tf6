import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // ^6.0.0
import { ResetPasswordForm } from '../../components/auth/ResetPasswordForm';
import { useAuth } from '../../hooks/useAuth';
import { Toast } from '../../components/common/Toast';
import { ERROR_MESSAGES, ERROR_SEVERITY_LEVELS } from '../../constants/error.constants';
import styles from './ResetPassword.module.css';

/**
 * ResetPassword page component for handling password reset functionality
 * with secure token validation and user feedback
 */
const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const { resetPassword } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastSeverity, setToastSeverity] = useState<keyof typeof ERROR_SEVERITY_LEVELS>('INFO');

  /**
   * Validates reset token from URL parameters
   */
  const validateToken = useCallback(async (resetToken: string): Promise<boolean> => {
    if (!resetToken || resetToken.length < 32) {
      setError(ERROR_MESSAGES.AUTH.TOKEN_INVALID);
      return false;
    }

    try {
      // Token format validation (example: UUID v4)
      const tokenRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!tokenRegex.test(resetToken)) {
        setError(ERROR_MESSAGES.AUTH.TOKEN_INVALID);
        return false;
      }

      return true;
    } catch (error) {
      setError(ERROR_MESSAGES.AUTH.TOKEN_INVALID);
      return false;
    }
  }, []);

  /**
   * Handles successful password reset
   */
  const handleResetSuccess = useCallback(() => {
    setToastMessage('Password has been successfully reset. Please login with your new password.');
    setToastSeverity('INFO');
    
    // Navigate to login page after short delay
    setTimeout(() => {
      navigate('/login');
    }, 2000);
  }, [navigate]);

  /**
   * Handles password reset errors with user feedback
   */
  const handleResetError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setToastMessage(errorMessage);
    setToastSeverity('ERROR');
    setLoading(false);
  }, []);

  /**
   * Validates token on component mount
   */
  useEffect(() => {
    if (!token) {
      setError(ERROR_MESSAGES.AUTH.TOKEN_MISSING);
      return;
    }

    validateToken(token).catch((error) => {
      console.error('Token validation failed:', error);
      setError(ERROR_MESSAGES.AUTH.TOKEN_INVALID);
    });

    // Cleanup on unmount
    return () => {
      setError(null);
      setLoading(false);
    };
  }, [token, validateToken]);

  /**
   * Handles toast dismissal
   */
  const handleToastClose = useCallback(() => {
    setToastMessage(null);
  }, []);

  if (!token) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage} role="alert">
          {ERROR_MESSAGES.AUTH.TOKEN_MISSING}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.resetCard}>
        <h1 className={styles.title}>Reset Password</h1>
        
        <div className={styles.instructions}>
          Please enter your new password below. The password must meet the following requirements:
          <ul className={styles.requirements}>
            <li>At least 12 characters long</li>
            <li>Include uppercase and lowercase letters</li>
            <li>Include at least one number</li>
            <li>Include at least one special character</li>
          </ul>
        </div>

        {error && (
          <div className={styles.errorMessage} role="alert">
            {error}
          </div>
        )}

        <ResetPasswordForm
          token={token}
          onSuccess={handleResetSuccess}
          onError={handleResetError}
          locale="en"
        />

        <div className={styles.links}>
          <button
            className={styles.backButton}
            onClick={() => navigate('/login')}
            type="button"
          >
            Back to Login
          </button>
        </div>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          severity={ERROR_SEVERITY_LEVELS[toastSeverity]}
          onClose={handleToastClose}
        />
      )}
    </div>
  );
};

export default ResetPassword;