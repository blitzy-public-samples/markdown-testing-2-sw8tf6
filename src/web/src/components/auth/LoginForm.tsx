import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { LoginCredentials, AuthResponse } from '../../interfaces/auth.interface';
import Input from '../common/Input';
import Button from '../common/Button';
import { AuthService } from '../../services/auth.service';
import { validateEmail, validatePassword } from '../../utils/validation.util';
import { ERROR_MESSAGES } from '../../constants/error.constants';

interface LoginFormProps {
  onSuccess: (response: AuthResponse) => void;
  onError: (error: Error & { correlationId?: string }) => void;
  onMfaRequired: (sessionToken: string) => void;
}

interface FormState {
  email: string;
  password: string;
  mfaToken?: string;
  errors: Record<string, string>;
  isLoading: boolean;
  correlationId: string;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onError,
  onMfaRequired
}) => {
  const navigate = useNavigate();
  const authService = useRef(new AuthService());
  const [formState, setFormState] = useState<FormState>({
    email: '',
    password: '',
    mfaToken: undefined,
    errors: {},
    isLoading: false,
    correlationId: `login-${Date.now()}`
  });

  // Debounced validation handlers
  const debouncedEmailValidation = useCallback(
    debounce(async (email: string) => {
      const validationResult = validateEmail(email);
      setFormState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          email: validationResult.isValid ? '' : validationResult.error || ERROR_MESSAGES.VALIDATION.INVALID_FORMAT
        }
      }));
    }, 300),
    []
  );

  const debouncedPasswordValidation = useCallback(
    debounce(async (password: string) => {
      const validationResult = validatePassword(password);
      setFormState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          password: validationResult.isValid ? '' : validationResult.error || ERROR_MESSAGES.VALIDATION.INVALID_FORMAT
        }
      }));
    }, 300),
    []
  );

  // Input change handler with validation
  const handleInputChange = useCallback((field: keyof FormState, value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
      errors: {
        ...prev.errors,
        [field]: ''
      }
    }));

    if (field === 'email') {
      debouncedEmailValidation(value);
    } else if (field === 'password') {
      debouncedPasswordValidation(value);
    }
  }, [debouncedEmailValidation, debouncedPasswordValidation]);

  // Form submission handler
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Validate all fields before submission
    const emailValidation = validateEmail(formState.email);
    const passwordValidation = validatePassword(formState.password);

    const errors: Record<string, string> = {};
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error || ERROR_MESSAGES.VALIDATION.INVALID_FORMAT;
    }
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.error || ERROR_MESSAGES.VALIDATION.INVALID_FORMAT;
    }

    if (Object.keys(errors).length > 0) {
      setFormState(prev => ({
        ...prev,
        errors
      }));
      return;
    }

    setFormState(prev => ({
      ...prev,
      isLoading: true,
      errors: {}
    }));

    try {
      const credentials: LoginCredentials = {
        email: formState.email,
        password: formState.password,
        mfaToken: formState.mfaToken
      };

      // Sign the request for enhanced security
      const signedCredentials = await authService.current.signRequest(credentials);
      const response = await authService.current.login(signedCredentials);

      if (response.requiresMfa) {
        onMfaRequired(response.sessionToken);
        return;
      }

      onSuccess(response);
      navigate('/dashboard');
    } catch (error: any) {
      const enhancedError = error as Error & { correlationId?: string };
      enhancedError.correlationId = formState.correlationId;
      
      setFormState(prev => ({
        ...prev,
        errors: {
          form: error.message || ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR
        }
      }));
      
      onError(enhancedError);
    } finally {
      setFormState(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedEmailValidation.cancel();
      debouncedPasswordValidation.cancel();
    };
  }, [debouncedEmailValidation, debouncedPasswordValidation]);

  return (
    <form 
      onSubmit={handleSubmit}
      className="login-form"
      aria-label="Login form"
      noValidate
    >
      <Input
        id="email"
        name="email"
        type="email"
        value={formState.email}
        onChange={(value) => handleInputChange('email', value)}
        error={formState.errors.email}
        placeholder="Email address"
        required
        aria-label="Email address"
        aria-required="true"
        aria-invalid={!!formState.errors.email}
        disabled={formState.isLoading}
      />

      <Input
        id="password"
        name="password"
        type="password"
        value={formState.password}
        onChange={(value) => handleInputChange('password', value)}
        error={formState.errors.password}
        placeholder="Password"
        required
        aria-label="Password"
        aria-required="true"
        aria-invalid={!!formState.errors.password}
        disabled={formState.isLoading}
      />

      {formState.errors.form && (
        <div 
          className="form-error" 
          role="alert"
          aria-live="polite"
        >
          {formState.errors.form}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        isLoading={formState.isLoading}
        isDisabled={formState.isLoading || Object.keys(formState.errors).length > 0}
        fullWidth
        aria-label="Sign in"
      >
        Sign in
      </Button>
    </form>
  );
};

export default LoginForm;