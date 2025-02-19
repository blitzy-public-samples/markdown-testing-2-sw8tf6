import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // ^6.0.0
import { PasswordResetData } from '../../interfaces/auth.interface';
import { validatePasswordReset } from '../../validators/auth.validator';
import { AuthService } from '../../services/auth.service';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import styles from './ResetPasswordForm.module.css';

interface ResetPasswordFormProps {
  token: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  locale: string;
}

interface FormState {
  password: string;
  confirmPassword: string;
  isSubmitting: boolean;
  errors: { [key: string]: string };
  passwordStrength: number;
  touchedFields: Set<string>;
  validationTimeout: number | null;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  token,
  onSuccess,
  onError,
  locale
}) => {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<FormState>({
    password: '',
    confirmPassword: '',
    isSubmitting: false,
    errors: {},
    passwordStrength: 0,
    touchedFields: new Set(),
    validationTimeout: null
  });

  // Clear form state on unmount for security
  useEffect(() => {
    return () => {
      setFormState(prev => ({
        ...prev,
        password: '',
        confirmPassword: '',
        errors: {}
      }));
    };
  }, []);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormState(prev => {
      // Clear existing validation timeout
      if (prev.validationTimeout) {
        window.clearTimeout(prev.validationTimeout);
      }

      // Mark field as touched
      const touchedFields = new Set(prev.touchedFields).add(field);

      // Create validation data
      const validationData: PasswordResetData = {
        token,
        password: field === 'password' ? value : prev.password,
        confirmPassword: field === 'confirmPassword' ? value : prev.confirmPassword
      };

      // Set new timeout for validation
      const validationTimeout = window.setTimeout(() => {
        const validationResult = validatePasswordReset(validationData);
        setFormState(current => ({
          ...current,
          errors: validationResult.errors || {},
          passwordStrength: validationResult.metadata?.passwordStrength || 0
        }));
      }, 300);

      return {
        ...prev,
        [field]: value,
        touchedFields,
        validationTimeout,
        errors: { ...prev.errors, [field]: '' }
      };
    });
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setFormState(prev => ({
      ...prev,
      isSubmitting: true,
      errors: {}
    }));

    try {
      // Validate form data
      const validationResult = validatePasswordReset({
        token,
        password: formState.password,
        confirmPassword: formState.confirmPassword
      });

      if (!validationResult.isValid) {
        setFormState(prev => ({
          ...prev,
          isSubmitting: false,
          errors: validationResult.errors || {}
        }));
        return;
      }

      // Call API to reset password
      await AuthService.resetPassword({
        token,
        password: formState.password,
        confirmPassword: formState.confirmPassword
      });

      // Clear sensitive data
      setFormState(prev => ({
        ...prev,
        password: '',
        confirmPassword: '',
        isSubmitting: false
      }));

      onSuccess();
      navigate('/login');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        errors: { submit: errorMessage }
      }));
      onError(errorMessage);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className={styles.resetPasswordForm}
      noValidate
      aria-label="Reset password form"
    >
      <div className={styles.formField}>
        <Input
          id="password"
          name="password"
          type="password"
          value={formState.password}
          onChange={(value) => handleInputChange('password', value)}
          placeholder="New password"
          required
          disabled={formState.isSubmitting}
          error={formState.errors.password}
          validation={{
            required: true,
            type: 'password'
          }}
          ariaLabel="New password"
        />
        {formState.passwordStrength > 0 && (
          <div 
            className={styles.passwordStrength}
            role="progressbar"
            aria-valuenow={formState.passwordStrength}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div 
              className={styles.strengthIndicator}
              style={{ width: `${formState.passwordStrength}%` }}
            />
          </div>
        )}
      </div>

      <div className={styles.formField}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={formState.confirmPassword}
          onChange={(value) => handleInputChange('confirmPassword', value)}
          placeholder="Confirm password"
          required
          disabled={formState.isSubmitting}
          error={formState.errors.confirmPassword}
          validation={{
            required: true,
            type: 'password'
          }}
          ariaLabel="Confirm password"
        />
      </div>

      {formState.errors.submit && (
        <div 
          className={styles.errorMessage}
          role="alert"
          aria-live="polite"
        >
          {formState.errors.submit}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        fullWidth
        isLoading={formState.isSubmitting}
        isDisabled={formState.isSubmitting || Object.keys(formState.errors).length > 0}
        ariaLabel="Reset password"
      >
        Reset Password
      </Button>
    </form>
  );
};

export default ResetPasswordForm;