import { Reducer } from 'redux'; // v4.2.1
import { 
  AuthActionTypes, 
  AuthState, 
  AuthAction 
} from './auth.types';

/**
 * Initial authentication state with security-focused defaults
 */
const initialState: AuthState = {
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

/**
 * Enhanced authentication reducer with comprehensive security features
 * Handles user authentication, MFA, email verification, and token management
 */
const authReducer: Reducer<AuthState, AuthAction> = (
  state = initialState,
  action
): AuthState => {
  switch (action.type) {
    // Login flow
    case AuthActionTypes.LOGIN_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        mfaRequired: false,
        lastActivity: new Date().toISOString()
      };

    case AuthActionTypes.LOGIN_SUCCESS:
      return {
        ...state,
        loading: false,
        user: action.payload.user,
        tokens: {
          accessToken: action.payload.accessToken,
          refreshToken: action.payload.refreshToken
        },
        isAuthenticated: true,
        error: null,
        mfaRequired: action.payload.user.isMFAEnabled && !state.mfaRequired,
        emailVerified: action.payload.user.isEmailVerified,
        tokenVersion: action.payload.tokenVersion,
        lastActivity: new Date().toISOString()
      };

    case AuthActionTypes.LOGIN_FAILURE:
      return {
        ...state,
        loading: false,
        error: {
          code: action.payload.code,
          message: action.payload.message
        },
        isAuthenticated: false,
        mfaRequired: false,
        lastActivity: new Date().toISOString()
      };

    // Registration flow
    case AuthActionTypes.REGISTER_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        lastActivity: new Date().toISOString()
      };

    case AuthActionTypes.REGISTER_SUCCESS:
      return {
        ...state,
        loading: false,
        user: action.payload.user,
        tokens: {
          accessToken: action.payload.accessToken,
          refreshToken: action.payload.refreshToken
        },
        isAuthenticated: true,
        error: null,
        emailVerified: false,
        tokenVersion: action.payload.tokenVersion,
        lastActivity: new Date().toISOString()
      };

    case AuthActionTypes.REGISTER_FAILURE:
      return {
        ...state,
        loading: false,
        error: {
          code: action.payload.code,
          message: action.payload.message
        },
        lastActivity: new Date().toISOString()
      };

    // Logout - securely clear all sensitive data
    case AuthActionTypes.LOGOUT:
      return {
        ...initialState,
        lastActivity: new Date().toISOString()
      };

    // Token refresh flow
    case AuthActionTypes.REFRESH_TOKEN_REQUEST:
      return {
        ...state,
        loading: true,
        lastActivity: new Date().toISOString()
      };

    case AuthActionTypes.REFRESH_TOKEN_SUCCESS:
      return {
        ...state,
        loading: false,
        tokens: {
          accessToken: action.payload.accessToken,
          refreshToken: action.payload.refreshToken
        },
        tokenVersion: state.tokenVersion + 1,
        lastActivity: new Date().toISOString()
      };

    case AuthActionTypes.REFRESH_TOKEN_FAILURE:
      // Token refresh failure requires re-authentication
      return {
        ...initialState,
        error: {
          code: action.payload.code,
          message: action.payload.message
        },
        lastActivity: new Date().toISOString()
      };

    // Email verification flow
    case AuthActionTypes.VERIFY_EMAIL_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        lastActivity: new Date().toISOString()
      };

    case AuthActionTypes.VERIFY_EMAIL_SUCCESS:
      return {
        ...state,
        loading: false,
        emailVerified: true,
        user: state.user ? { ...state.user, isEmailVerified: true } : null,
        lastActivity: new Date().toISOString()
      };

    case AuthActionTypes.VERIFY_EMAIL_FAILURE:
      return {
        ...state,
        loading: false,
        error: {
          code: action.payload.code,
          message: action.payload.message
        },
        lastActivity: new Date().toISOString()
      };

    // MFA setup flow
    case AuthActionTypes.SETUP_MFA_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        mfaSetup: null,
        lastActivity: new Date().toISOString()
      };

    case AuthActionTypes.SETUP_MFA_SUCCESS:
      return {
        ...state,
        loading: false,
        mfaSetup: {
          secret: action.payload.secret,
          qrCode: action.payload.qrCode
        },
        lastActivity: new Date().toISOString()
      };

    case AuthActionTypes.SETUP_MFA_FAILURE:
      return {
        ...state,
        loading: false,
        error: {
          code: action.payload.code,
          message: action.payload.message
        },
        mfaSetup: null,
        lastActivity: new Date().toISOString()
      };

    // MFA verification flow
    case AuthActionTypes.VERIFY_MFA_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        lastActivity: new Date().toISOString()
      };

    case AuthActionTypes.VERIFY_MFA_SUCCESS:
      return {
        ...state,
        loading: false,
        mfaRequired: false,
        user: {
          ...state.user!,
          isMFAEnabled: true
        },
        tokens: {
          accessToken: action.payload.accessToken,
          refreshToken: action.payload.refreshToken
        },
        tokenVersion: action.payload.tokenVersion,
        lastActivity: new Date().toISOString()
      };

    case AuthActionTypes.VERIFY_MFA_FAILURE:
      return {
        ...state,
        loading: false,
        error: {
          code: action.payload.code,
          message: action.payload.message
        },
        lastActivity: new Date().toISOString()
      };

    default:
      return state;
  }
};

export default authReducer;