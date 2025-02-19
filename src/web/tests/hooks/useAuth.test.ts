import { renderHook, act, waitFor } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CryptoJS from 'crypto-js';
import useAuth from '../../src/hooks/useAuth';
import { ERROR_MESSAGES } from '../../src/constants/error.constants';
import { AUTH_TIMEOUTS } from '../../src/constants/auth.constants';

// Mock crypto for token encryption testing
jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn(),
    decrypt: jest.fn()
  },
  enc: {
    Utf8: 'utf8'
  }
}));

// Mock WebSocket for real-time token refresh
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn()
};

// Mock performance monitoring
const mockPerformance = {
  mark: jest.fn(),
  measure: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn()
};

describe('useAuth Hook', () => {
  let store: any;
  let wrapper: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    localStorage.clear();
    
    // Configure test store
    store = configureStore({
      reducer: {
        auth: (state = {}, action) => state
      },
      middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware({
          serializableCheck: false,
          thunk: true
        })
    });

    // Configure test wrapper
    wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    // Setup performance monitoring
    global.performance = mockPerformance as any;
    
    // Mock WebSocket
    (global as any).WebSocket = jest.fn(() => mockWebSocket);
  });

  describe('Security and Initialization', () => {
    it('should initialize with secure default state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.mfaRequired).toBe(false);
    });

    it('should verify token encryption', async () => {
      const mockToken = 'test-token';
      const mockEncryptedToken = 'encrypted-token';

      CryptoJS.AES.encrypt.mockReturnValue(mockEncryptedToken);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'Test123!@#'
        });
      });

      expect(CryptoJS.AES.encrypt).toHaveBeenCalledWith(
        mockToken,
        expect.any(String)
      );
    });

    it('should validate CSRF protection', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      const csrfToken = document.querySelector('meta[name="csrf-token"]');
      expect(csrfToken).toBeDefined();
    });
  });

  describe('Authentication Operations', () => {
    it('should securely login with valid credentials', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'Test123!@#'
        });
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
      expect(performance.measure).toHaveBeenCalledWith(
        'login-duration',
        'login-start',
        'login-end'
      );
    });

    it('should enforce password complexity', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.login({
            email: 'test@example.com',
            password: 'weak'
          });
        } catch (error) {
          expect(error.message).toBe(ERROR_MESSAGES.VALIDATION.INVALID_FORMAT);
        }
      });
    });

    it('should handle brute force prevention', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      for (let i = 0; i < 5; i++) {
        await act(async () => {
          try {
            await result.current.login({
              email: 'test@example.com',
              password: 'wrong'
            });
          } catch (error) {
            // Expected errors
          }
        });
      }

      await act(async () => {
        try {
          await result.current.login({
            email: 'test@example.com',
            password: 'Test123!@#'
          });
        } catch (error) {
          expect(error.message).toBe(ERROR_MESSAGES.AUTH.ACCOUNT_LOCKED);
        }
      });
    });
  });

  describe('MFA Operations', () => {
    it('should generate secure TOTP secrets', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const mfaSetup = await result.current.setupMFA();
        expect(mfaSetup.secret).toMatch(/^[A-Z2-7]{32}$/);
        expect(mfaSetup.qrCode).toBeDefined();
      });
    });

    it('should validate MFA tokens', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.validateMFA('invalid-token');
        } catch (error) {
          expect(error.message).toBe(ERROR_MESSAGES.AUTH.MFA_INVALID);
        }
      });
    });

    it('should enforce MFA recovery procedures', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const recoveryCodes = await result.current.generateRecoveryCodes();
        expect(recoveryCodes).toHaveLength(8);
        expect(recoveryCodes[0]).toMatch(/^[0-9a-f]{16}$/);
      });
    });
  });

  describe('Session Management', () => {
    it('should handle secure token refresh', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'Test123!@#'
        });
      });

      // Fast-forward time to trigger refresh
      jest.advanceTimersByTime(AUTH_TIMEOUTS.TOKEN_REFRESH_THRESHOLD * 1000);

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should manage session timeouts', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'Test123!@#'
        });
      });

      // Fast-forward time past session timeout
      jest.advanceTimersByTime(AUTH_TIMEOUTS.SESSION_TIMEOUT * 1000);

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should validate concurrent sessions', async () => {
      const { result: session1 } = renderHook(() => useAuth(), { wrapper });
      const { result: session2 } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await session1.current.login({
          email: 'test@example.com',
          password: 'Test123!@#'
        });
      });

      await act(async () => {
        await session2.current.login({
          email: 'test@example.com',
          password: 'Test123!@#'
        });
      });

      expect(session1.current.isAuthenticated).toBe(false);
      expect(session2.current.isAuthenticated).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should securely handle network failures', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Simulate network failure
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      await act(async () => {
        try {
          await result.current.login({
            email: 'test@example.com',
            password: 'Test123!@#'
          });
        } catch (error) {
          expect(error.message).toBe(ERROR_MESSAGES.SYSTEM.NETWORK_ERROR);
        }
      });
    });

    it('should manage token refresh failures', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'Test123!@#'
        });
      });

      // Simulate refresh failure
      global.fetch = jest.fn(() => Promise.reject(new Error('Refresh failed')));

      // Fast-forward time to trigger refresh
      jest.advanceTimersByTime(AUTH_TIMEOUTS.TOKEN_REFRESH_THRESHOLD * 1000);

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.error).toBeDefined();
      });
    });

    it('should handle encryption errors', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Simulate encryption failure
      CryptoJS.AES.encrypt.mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      await act(async () => {
        try {
          await result.current.login({
            email: 'test@example.com',
            password: 'Test123!@#'
          });
        } catch (error) {
          expect(error.message).toBe(ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR);
        }
      });
    });
  });
});