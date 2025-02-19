import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RegistrationData, ApiError, UserRole } from '../../interfaces/auth.interface';
import { validateRegistrationData, ValidationResult } from '../../validators/auth.validator';
import { AuthService } from '../../services/auth.service';
import Input from '../common/Input';
import Button from '../common/Button';

// Version of external packages used
// react: ^18.x
// react-router-dom: ^6.x
// react-i18next: ^12.x

interface RegisterFormProps {
  onSuccess: (response: AuthResponse) => void;
  onError: (error: ApiError) => void;
  onMFARequired: (setupData: MFASetupData) => void;
}

interface FormState extends RegistrationData {
  confirmPassword: string;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onError,
  onMFARequired
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authService = new AuthService();

  const [formState, setFormState] = useState<FormState>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: UserRole.USER,
    consentGiven: false,
    errors: {},
    isSubmitting: false
  });

  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout>();

  const validateField = useCallback(async (
    field: keyof FormState,
    value: string | boolean
  ): Promise<void> => {
    const data = { ...formState, [field]: value };
    const validation = await validateRegistrationData(data);
    
    setFormState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [field]: validation.errors[field] || ''
      }
    }));
  }, [formState]);

  const handleInputChange = useCallback((
    field: keyof FormState,
    value: string | boolean
  ) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
      errors: {
        ...prev.errors,
        [field]: ''
      }
    }));

    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    const timeout = setTimeout(() => {
      validateField(field, value);
    }, 300);

    setValidationTimeout(timeout);
  }, [validateField, validationTimeout]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (formState.isSubmitting) return;

    setFormState(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Validate all fields
      const validation = await validateRegistrationData({
        email: formState.email,
        password: formState.password,
        name: formState.name,
        role: formState.role,
        consentGiven: formState.consentGiven
      });

      if (!validation.isValid) {
        setFormState(prev => ({
          ...prev,
          errors: validation.errors,
          isSubmitting: false
        }));
        return;
      }

      // Verify password confirmation
      if (formState.password !== formState.confirmPassword) {
        setFormState(prev => ({
          ...prev,
          errors: {
            ...prev.errors,
            confirmPassword: t('auth.errors.passwordMismatch')
          },
          isSubmitting: false
        }));
        return;
      }

      // Verify GDPR consent
      if (!formState.consentGiven) {
        setFormState(prev => ({
          ...prev,
          errors: {
            ...prev.errors,
            consent: t('auth.errors.consentRequired')
          },
          isSubmitting: false
        }));
        return;
      }

      const response = await authService.register({
        email: formState.email,
        password: formState.password,
        name: formState.name,
        role: formState.role,
        consentGiven: formState.consentGiven
      });

      // Handle MFA setup if required
      if (response.requiresMFA) {
        const mfaSetup = await authService.setupMFA();
        onMFARequired(mfaSetup);
        return;
      }

      onSuccess(response);
      navigate('/dashboard');

    } catch (error) {
      onError(error as ApiError);
      setFormState(prev => ({
        ...prev,
        isSubmitting: false
      }));
    }
  };

  useEffect(() => {
    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [validationTimeout]);

  return (
    <form onSubmit={handleSubmit} className="register-form" noValidate>
      <Input
        id="register-email"
        name="email"
        type="email"
        value={formState.email}
        onChange={(value) => handleInputChange('email', value)}
        error={formState.errors.email}
        placeholder={t('auth.placeholders.email')}
        required
        aria-label={t('auth.labels.email')}
      />

      <Input
        id="register-name"
        name="name"
        type="text"
        value={formState.name}
        onChange={(value) => handleInputChange('name', value)}
        error={formState.errors.name}
        placeholder={t('auth.placeholders.name')}
        required
        aria-label={t('auth.labels.name')}
      />

      <Input
        id="register-password"
        name="password"
        type="password"
        value={formState.password}
        onChange={(value) => handleInputChange('password', value)}
        error={formState.errors.password}
        placeholder={t('auth.placeholders.password')}
        required
        aria-label={t('auth.labels.password')}
      />

      <Input
        id="register-confirm-password"
        name="confirmPassword"
        type="password"
        value={formState.confirmPassword}
        onChange={(value) => handleInputChange('confirmPassword', value)}
        error={formState.errors.confirmPassword}
        placeholder={t('auth.placeholders.confirmPassword')}
        required
        aria-label={t('auth.labels.confirmPassword')}
      />

      <div className="consent-section">
        <label className="consent-label">
          <input
            type="checkbox"
            checked={formState.consentGiven}
            onChange={(e) => handleInputChange('consentGiven', e.target.checked)}
            aria-label={t('auth.labels.consent')}
          />
          <span>{t('auth.labels.consentText')}</span>
        </label>
        {formState.errors.consent && (
          <div className="error-message" role="alert">
            {formState.errors.consent}
          </div>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        fullWidth
        isLoading={formState.isSubmitting}
        isDisabled={formState.isSubmitting}
        aria-label={t('auth.buttons.register')}
      >
        {t('auth.buttons.register')}
      </Button>
    </form>
  );
};

export default RegisterForm;