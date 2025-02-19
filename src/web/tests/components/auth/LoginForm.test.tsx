import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import LoginForm from '../../../../src/components/auth/LoginForm';
import { AuthService } from '../../../../src/services/auth.service';
import { ERROR_MESSAGES } from '../../../../src/constants/error.constants';
import { PASSWORD_VALIDATION } from '../../../../src/constants/validation.constants';

// Mock react-router-dom's useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn()
  };
});

describe('LoginForm', () => {
  // Test data
  const validCredentials = {
    email: 'test@example.com',
    password: 'P@ssw0rd123!',
  };

  const mockNavigate = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();
  const mockOnMfaRequired = vi.fn();

  // Mock AuthService methods
  const mockAuthService = {
    login: vi.fn(),
    signRequest: vi.fn(),
    verifyMFA: vi.fn()
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Setup navigation mock
    (useNavigate as any).mockReturnValue(mockNavigate);
    
    // Setup AuthService mocks with default successful responses
    mockAuthService.login.mockResolvedValue({
      accessToken: 'mock-token',
      requiresMfa: false
    });
    mockAuthService.signRequest.mockImplementation(data => data);
    mockAuthService.verifyMFA.mockResolvedValue({ verified: true });

    // Mock the AuthService constructor
    vi.spyOn(AuthService.prototype, 'login').mockImplementation(mockAuthService.login);
    vi.spyOn(AuthService.prototype, 'signRequest').mockImplementation(mockAuthService.signRequest);
    vi.spyOn(AuthService.prototype, 'verifyMFA').mockImplementation(mockAuthService.verifyMFA);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Render helper with required providers
  const renderLoginForm = () => {
    return render(
      <BrowserRouter>
        <LoginForm
          onSuccess={mockOnSuccess}
          onError={mockOnError}
          onMfaRequired={mockOnMfaRequired}
        />
      </BrowserRouter>
    );
  };

  // Test Suite 1: Component Rendering and Accessibility
  describe('Rendering and Accessibility', () => {
    it('renders login form with proper accessibility attributes', () => {
      renderLoginForm();
      
      const form = screen.getByRole('form', { name: /login form/i });
      expect(form).toHaveAttribute('novalidate');
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i });
      expect(emailInput).toHaveAttribute('aria-required', 'true');
      
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('aria-required', 'true');
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeEnabled();
    });

    it('maintains proper focus management', async () => {
      renderLoginForm();
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i });
      const passwordInput = screen.getByLabelText(/password/i);
      
      // Test keyboard navigation
      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);
      
      fireEvent.keyDown(emailInput, { key: 'Tab' });
      await waitFor(() => {
        expect(document.activeElement).toBe(passwordInput);
      });
    });
  });

  // Test Suite 2: Form Validation
  describe('Form Validation', () => {
    it('validates required fields', async () => {
      renderLoginForm();
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD)).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      renderLoginForm();
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i });
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);
      
      await waitFor(() => {
        expect(screen.getByText(ERROR_MESSAGES.VALIDATION.INVALID_FORMAT)).toBeInTheDocument();
      });
    });

    it('validates password complexity', async () => {
      renderLoginForm();
      
      const passwordInput = screen.getByLabelText(/password/i);
      fireEvent.change(passwordInput, { target: { value: 'weak' } });
      fireEvent.blur(passwordInput);
      
      await waitFor(() => {
        expect(screen.getByText(new RegExp(PASSWORD_VALIDATION.MIN_LENGTH.toString()))).toBeInTheDocument();
      });
    });
  });

  // Test Suite 3: Authentication Flow
  describe('Authentication Flow', () => {
    it('handles successful login', async () => {
      renderLoginForm();
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i });
      const passwordInput = screen.getByLabelText(/password/i);
      
      fireEvent.change(emailInput, { target: { value: validCredentials.email } });
      fireEvent.change(passwordInput, { target: { value: validCredentials.password } });
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalledWith({
          email: validCredentials.email,
          password: validCredentials.password,
          mfaToken: undefined
        });
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('handles MFA requirement', async () => {
      mockAuthService.login.mockResolvedValueOnce({
        requiresMfa: true,
        sessionToken: 'mfa-session-token'
      });
      
      renderLoginForm();
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i });
      const passwordInput = screen.getByLabelText(/password/i);
      
      fireEvent.change(emailInput, { target: { value: validCredentials.email } });
      fireEvent.change(passwordInput, { target: { value: validCredentials.password } });
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnMfaRequired).toHaveBeenCalledWith('mfa-session-token');
      });
    });

    it('handles authentication errors', async () => {
      const errorMessage = ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS;
      mockAuthService.login.mockRejectedValueOnce(new Error(errorMessage));
      
      renderLoginForm();
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i });
      const passwordInput = screen.getByLabelText(/password/i);
      
      fireEvent.change(emailInput, { target: { value: validCredentials.email } });
      fireEvent.change(passwordInput, { target: { value: validCredentials.password } });
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(mockOnError).toHaveBeenCalled();
      });
    });
  });

  // Test Suite 4: Security Features
  describe('Security Features', () => {
    it('masks password input', () => {
      renderLoginForm();
      
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('prevents multiple submission attempts while loading', async () => {
      mockAuthService.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      renderLoginForm();
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i });
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(emailInput, { target: { value: validCredentials.email } });
      fireEvent.change(passwordInput, { target: { value: validCredentials.password } });
      
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
      expect(submitButton).toBeDisabled();
    });
  });
});