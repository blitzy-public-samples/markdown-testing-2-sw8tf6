import { describe, it, expect, beforeEach } from 'jest'; // ^29.7.0
import { authReducer } from '../../src/store/auth/auth.reducer';
import { 
  AuthActionTypes, 
  AuthState, 
  AuthAction,
  AuthError,
  MFAConfig,
  TokenPair 
} from '../../src/store/auth/auth.types';

describe('authReducer', () => {
  // Mock data setup
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
    isEmailVerified: false,
    isMFAEnabled: false,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockTokens: TokenPair = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token'
  };

  const mockError: AuthError = {
    code: 'AUTH_ERROR',
    message: 'Authentication failed',
    details: {},
    timestamp: new Date()
  };

  const mockMFAConfig: MFAConfig = {
    secret: 'mock-mfa-secret',
    qrCode: 'mock-qr-code',
    recoveryKeys: ['key1', 'key2'],
    mfaType: 'totp',
    backupMethod: 'recovery-keys'
  };

  let initialState: AuthState;

  beforeEach(() => {
    initialState = {
      user: null,
      tokens: null,
      loading: false,
      error: null,
      isAuthenticated: false,
      mfaRequired: false,
      mfaSetup: null,
      emailVerified: false,
      tokenVersion: 0,
      lastActivity: null
    };
  });

  describe('Login Flow Tests', () => {
    it('should handle LOGIN_REQUEST', () => {
      const action = { type: AuthActionTypes.LOGIN_REQUEST };
      const state = authReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
      expect(state.lastActivity).toBeTruthy();
    });

    it('should handle LOGIN_SUCCESS with MFA disabled', () => {
      const action = {
        type: AuthActionTypes.LOGIN_SUCCESS,
        payload: {
          user: { ...mockUser },
          ...mockTokens,
          tokenVersion: 1
        }
      };
      const state = authReducer(initialState, action);

      expect(state.user).toEqual(mockUser);
      expect(state.tokens).toEqual(mockTokens);
      expect(state.isAuthenticated).toBe(true);
      expect(state.mfaRequired).toBe(false);
      expect(state.tokenVersion).toBe(1);
    });

    it('should handle LOGIN_SUCCESS with MFA enabled', () => {
      const action = {
        type: AuthActionTypes.LOGIN_SUCCESS,
        payload: {
          user: { ...mockUser, isMFAEnabled: true },
          ...mockTokens,
          tokenVersion: 1
        }
      };
      const state = authReducer(initialState, action);

      expect(state.mfaRequired).toBe(true);
    });

    it('should handle LOGIN_FAILURE', () => {
      const action = {
        type: AuthActionTypes.LOGIN_FAILURE,
        payload: mockError
      };
      const state = authReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toEqual({
        code: mockError.code,
        message: mockError.message
      });
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('Registration Flow Tests', () => {
    it('should handle REGISTER_REQUEST', () => {
      const action = { type: AuthActionTypes.REGISTER_REQUEST };
      const state = authReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle REGISTER_SUCCESS', () => {
      const action = {
        type: AuthActionTypes.REGISTER_SUCCESS,
        payload: {
          user: mockUser,
          ...mockTokens,
          tokenVersion: 1
        }
      };
      const state = authReducer(initialState, action);

      expect(state.user).toEqual(mockUser);
      expect(state.tokens).toEqual(mockTokens);
      expect(state.isAuthenticated).toBe(true);
      expect(state.emailVerified).toBe(false);
    });

    it('should handle REGISTER_FAILURE', () => {
      const action = {
        type: AuthActionTypes.REGISTER_FAILURE,
        payload: mockError
      };
      const state = authReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toEqual({
        code: mockError.code,
        message: mockError.message
      });
    });
  });

  describe('Token Management Tests', () => {
    it('should handle REFRESH_TOKEN_REQUEST', () => {
      const action = { type: AuthActionTypes.REFRESH_TOKEN_REQUEST };
      const state = authReducer(initialState, action);

      expect(state.loading).toBe(true);
    });

    it('should handle REFRESH_TOKEN_SUCCESS', () => {
      const initialStateWithTokens = {
        ...initialState,
        tokenVersion: 1
      };
      const action = {
        type: AuthActionTypes.REFRESH_TOKEN_SUCCESS,
        payload: mockTokens
      };
      const state = authReducer(initialStateWithTokens, action);

      expect(state.tokens).toEqual(mockTokens);
      expect(state.tokenVersion).toBe(2);
    });

    it('should handle REFRESH_TOKEN_FAILURE', () => {
      const action = {
        type: AuthActionTypes.REFRESH_TOKEN_FAILURE,
        payload: mockError
      };
      const state = authReducer(initialState, action);

      expect(state).toEqual({
        ...initialState,
        error: {
          code: mockError.code,
          message: mockError.message
        },
        lastActivity: expect.any(String)
      });
    });
  });

  describe('Email Verification Tests', () => {
    it('should handle VERIFY_EMAIL_REQUEST', () => {
      const action = { type: AuthActionTypes.VERIFY_EMAIL_REQUEST };
      const state = authReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle VERIFY_EMAIL_SUCCESS', () => {
      const initialStateWithUser = {
        ...initialState,
        user: mockUser
      };
      const action = { type: AuthActionTypes.VERIFY_EMAIL_SUCCESS };
      const state = authReducer(initialStateWithUser, action);

      expect(state.emailVerified).toBe(true);
      expect(state.user?.isEmailVerified).toBe(true);
    });

    it('should handle VERIFY_EMAIL_FAILURE', () => {
      const action = {
        type: AuthActionTypes.VERIFY_EMAIL_FAILURE,
        payload: mockError
      };
      const state = authReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toEqual({
        code: mockError.code,
        message: mockError.message
      });
    });
  });

  describe('MFA Flow Tests', () => {
    it('should handle SETUP_MFA_REQUEST', () => {
      const action = { type: AuthActionTypes.SETUP_MFA_REQUEST };
      const state = authReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.mfaSetup).toBeNull();
    });

    it('should handle SETUP_MFA_SUCCESS', () => {
      const action = {
        type: AuthActionTypes.SETUP_MFA_SUCCESS,
        payload: {
          secret: mockMFAConfig.secret,
          qrCode: mockMFAConfig.qrCode
        }
      };
      const state = authReducer(initialState, action);

      expect(state.mfaSetup).toEqual({
        secret: mockMFAConfig.secret,
        qrCode: mockMFAConfig.qrCode
      });
    });

    it('should handle VERIFY_MFA_SUCCESS', () => {
      const initialStateWithUser = {
        ...initialState,
        user: mockUser,
        mfaRequired: true
      };
      const action = {
        type: AuthActionTypes.VERIFY_MFA_SUCCESS,
        payload: {
          user: { ...mockUser, isMFAEnabled: true },
          ...mockTokens,
          tokenVersion: 1
        }
      };
      const state = authReducer(initialStateWithUser, action);

      expect(state.mfaRequired).toBe(false);
      expect(state.user?.isMFAEnabled).toBe(true);
      expect(state.tokens).toEqual(mockTokens);
    });
  });

  describe('Security Tests', () => {
    it('should clear sensitive data on LOGOUT', () => {
      const populatedState: AuthState = {
        ...initialState,
        user: mockUser,
        tokens: mockTokens,
        isAuthenticated: true,
        mfaSetup: mockMFAConfig
      };
      const action = { type: AuthActionTypes.LOGOUT };
      const state = authReducer(populatedState, action);

      expect(state).toEqual({
        ...initialState,
        lastActivity: expect.any(String)
      });
    });

    it('should maintain token version integrity during refresh', () => {
      const stateWithToken = {
        ...initialState,
        tokenVersion: 5
      };
      const action = {
        type: AuthActionTypes.REFRESH_TOKEN_SUCCESS,
        payload: mockTokens
      };
      const state = authReducer(stateWithToken, action);

      expect(state.tokenVersion).toBe(6);
    });

    it('should handle invalid tokens by clearing auth state', () => {
      const action = {
        type: AuthActionTypes.REFRESH_TOKEN_FAILURE,
        payload: {
          code: 'INVALID_TOKEN',
          message: 'Token is invalid or expired'
        }
      };
      const state = authReducer(initialState, action);

      expect(state.isAuthenticated).toBe(false);
      expect(state.tokens).toBeNull();
      expect(state.user).toBeNull();
    });
  });
});