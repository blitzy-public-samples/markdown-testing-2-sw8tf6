import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { AuthService } from '../../services/auth.service';
import { ERROR_MESSAGES } from '../../constants/error.constants';

interface ForgotPasswordFormState {
  email: string;
  isValid: boolean;
  isLoading: boolean;
  errorMessage: string;
  attemptCount: number;
  securityToken: string;
}

const ForgotPasswordForm: React.FC = () => {
  const { t } = useTranslation();
  const [formState, setFormState] = useState<ForgotPasswordFormState>({
    email: '',
    isValid: false,
    isLoading: false,
    errorMessage: '',
    attemptCount: 0,
    securityToken: '',
  });

  // Generate CSRF token on mount
  useEffect(() => {
    const token = `csrf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setFormState(prev => ({ ...prev, securityToken: token }));
    return () => {
      cleanupSensitiveData();
    };
  }, []);

  // Handle email input changes with validation
  const handleEmailChange = useCallback((value: string, isValid: boolean) => {
    setFormState(prev => ({
      ...prev,
      email: value,
      isValid,
      errorMessage: '',
    }));
  }, []);

  // Clean up sensitive data
  const cleanupSensitiveData = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      email: '',
      securityToken: '',
      errorMessage: '',
    }));
  }, []);

  // Handle form submission with rate limiting and security measures
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validate rate limiting
    if (formState.attemptCount >= 5) {
      setFormState(prev => ({
        ...prev,
        errorMessage: ERROR_MESSAGES.AUTH.ACCOUNT_LOCKED,
      }));
      return;
    }

    // Update attempt count
    setFormState(prev => ({
      ...prev,
      attemptCount: prev.attemptCount + 1,
      isLoading: true,
      errorMessage: '',
    }));

    try {
      // Validate request with security token
      await AuthService.validateResetRequest({
        email: formState.email,
        securityToken: formState.securityToken,
      });

      // Send password reset request
      await AuthService.resetPassword(formState.email);

      // Show success message
      toast.success(t('auth.passwordReset.success'), {
        position: 'top-right',
        autoClose: 5000,
      });

      // Clear form
      cleanupSensitiveData();
    } catch (error) {
      let errorMessage = ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR;

      if (error instanceof Error) {
        switch (error.message) {
          case 'RATE_LIMIT_EXCEEDED':
            errorMessage = ERROR_MESSAGES.SYSTEM.RATE_LIMIT_EXCEEDED;
            break;
          case 'USER_NOT_FOUND':
            errorMessage = ERROR_MESSAGES.BUSINESS.RESOURCE_NOT_FOUND;
            break;
          case 'INVALID_TOKEN':
            errorMessage = ERROR_MESSAGES.AUTH.TOKEN_INVALID;
            break;
          default:
            errorMessage = error.message;
        }
      }

      setFormState(prev => ({
        ...prev,
        errorMessage,
      }));

      // Log security-relevant events
      console.error('Password reset error:', {
        timestamp: new Date().toISOString(),
        error: errorMessage,
        attemptCount: formState.attemptCount,
      });
    } finally {
      setFormState(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="forgot-password-form"
      noValidate
      aria-labelledby="forgot-password-title"
    >
      <h2 id="forgot-password-title" className="form-title">
        {t('auth.passwordReset.title')}
      </h2>

      <div className="form-description" aria-describedby="form-description">
        <p id="form-description">
          {t('auth.passwordReset.description')}
        </p>
      </div>

      <Input
        id="email"
        name="email"
        type="email"
        value={formState.email}
        onChange={handleEmailChange}
        placeholder={t('auth.email.placeholder')}
        required
        disabled={formState.isLoading}
        error={formState.errorMessage}
        aria-label={t('auth.email.label')}
        aria-required="true"
        aria-invalid={!!formState.errorMessage}
        validation={{
          required: true,
          type: 'email',
        }}
      />

      <Button
        type="submit"
        isLoading={formState.isLoading}
        isDisabled={!formState.isValid || formState.isLoading}
        fullWidth
        aria-label={t('auth.passwordReset.submit')}
      >
        {t('auth.passwordReset.submit')}
      </Button>

      {formState.errorMessage && (
        <div
          className="error-message"
          role="alert"
          aria-live="polite"
        >
          {formState.errorMessage}
        </div>
      )}

      <input
        type="hidden"
        name="securityToken"
        value={formState.securityToken}
      />
    </form>
  );
};

export default ForgotPasswordForm;