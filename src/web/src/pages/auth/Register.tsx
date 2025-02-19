import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import RegisterForm from '../../components/auth/RegisterForm';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { ERROR_MESSAGES } from '../../constants/error.constants';
import { PUBLIC_ROUTES, DEFAULT_REDIRECT } from '../../constants/routes.constants';
import { AuthResponse } from '../../interfaces/auth.interface';

/**
 * Registration page component with comprehensive security features
 * Implements WCAG 2.1 AA compliance and performance optimizations
 */
const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();
  const [registrationAttempts, setRegistrationAttempts] = useState<number>(0);
  const MAX_REGISTRATION_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  // Check for existing lockout on component mount
  useEffect(() => {
    const storedLockout = localStorage.getItem('registration_lockout');
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout, 10);
      if (lockoutTime > Date.now()) {
        setLockoutUntil(lockoutTime);
      } else {
        localStorage.removeItem('registration_lockout');
      }
    }
  }, []);

  // Handle successful registration
  const handleRegistrationSuccess = useCallback(async (response: AuthResponse) => {
    // Clear any existing lockout state
    localStorage.removeItem('registration_lockout');
    setRegistrationAttempts(0);
    setLockoutUntil(null);

    // Show success message with screen reader consideration
    toast.success('Registration successful! Please verify your email.', {
      role: 'status',
      'aria-live': 'polite',
      autoClose: 5000,
    });

    // Navigate to email verification with secure state
    navigate(PUBLIC_ROUTES.VERIFY_EMAIL.replace(':verificationToken', ''), {
      state: {
        email: response.user.email,
        requiresVerification: true,
      },
      replace: true,
    });
  }, [navigate]);

  // Handle registration errors with rate limiting
  const handleRegistrationError = useCallback((error: Error) => {
    const newAttempts = registrationAttempts + 1;
    setRegistrationAttempts(newAttempts);

    // Implement rate limiting
    if (newAttempts >= MAX_REGISTRATION_ATTEMPTS) {
      const lockoutTime = Date.now() + LOCKOUT_DURATION;
      setLockoutUntil(lockoutTime);
      localStorage.setItem('registration_lockout', lockoutTime.toString());

      toast.error(ERROR_MESSAGES.AUTH.ACCOUNT_LOCKED, {
        role: 'alert',
        'aria-live': 'assertive',
        autoClose: 7000,
      });
      return;
    }

    // Show error message with screen reader consideration
    toast.error(error.message || ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS, {
      role: 'alert',
      'aria-live': 'assertive',
      autoClose: 5000,
    });
  }, [registrationAttempts]);

  // Redirect authenticated users
  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = localStorage.getItem('access_token');
      if (isAuthenticated) {
        navigate(DEFAULT_REDIRECT.AUTHENTICATED, { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  // Check for lockout status
  if (lockoutUntil && lockoutUntil > Date.now()) {
    const remainingTime = Math.ceil((lockoutUntil - Date.now()) / 1000 / 60);
    return (
      <MainLayout>
        <div
          role="alert"
          aria-live="polite"
          className="registration-lockout"
        >
          <h1>Registration Temporarily Disabled</h1>
          <p>
            Too many unsuccessful attempts. Please try again in {remainingTime} minutes.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div
        className="register-container"
        role="main"
        aria-labelledby="register-heading"
      >
        <h1 id="register-heading" className="register-heading">
          Create an Account
        </h1>
        
        <RegisterForm
          onSuccess={handleRegistrationSuccess}
          onError={handleRegistrationError}
          isLoading={loading}
          error={error}
          remainingAttempts={MAX_REGISTRATION_ATTEMPTS - registrationAttempts}
        />

        <div className="register-footer">
          <p>
            Already have an account?{' '}
            <a
              href={PUBLIC_ROUTES.LOGIN}
              className="login-link"
              aria-label="Go to login page"
            >
              Log in
            </a>
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default Register;