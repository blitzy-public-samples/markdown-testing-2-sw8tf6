import { Action } from 'redux'; // v4.2.1
import { 
  AuthResponse, 
  LoginCredentials, 
  RegistrationData, 
  MFASetupData 
} from '../../interfaces/auth.interface';

/**
 * Enumeration of all possible authentication action types
 * Includes comprehensive authentication flows with MFA and email verification
 */
export enum AuthActionTypes {
  // Login flow
  LOGIN_REQUEST = '@auth/LOGIN_REQUEST',
  LOGIN_SUCCESS = '@auth/LOGIN_SUCCESS',
  LOGIN_FAILURE = '@auth/LOGIN_FAILURE',

  // Registration flow
  REGISTER_REQUEST = '@auth/REGISTER_REQUEST',
  REGISTER_SUCCESS = '@auth/REGISTER_SUCCESS',
  REGISTER_FAILURE = '@auth/REGISTER_FAILURE',

  // Logout
  LOGOUT = '@auth/LOGOUT',

  // Token refresh flow
  REFRESH_TOKEN_REQUEST = '@auth/REFRESH_TOKEN_REQUEST',
  REFRESH_TOKEN_SUCCESS = '@auth/REFRESH_TOKEN_SUCCESS',
  REFRESH_TOKEN_FAILURE = '@auth/REFRESH_TOKEN_FAILURE',

  // Email verification flow
  VERIFY_EMAIL_REQUEST = '@auth/VERIFY_EMAIL_REQUEST',
  VERIFY_EMAIL_SUCCESS = '@auth/VERIFY_EMAIL_SUCCESS',
  VERIFY_EMAIL_FAILURE = '@auth/VERIFY_EMAIL_FAILURE',

  // MFA setup flow
  SETUP_MFA_REQUEST = '@auth/SETUP_MFA_REQUEST',
  SETUP_MFA_SUCCESS = '@auth/SETUP_MFA_SUCCESS',
  SETUP_MFA_FAILURE = '@auth/SETUP_MFA_FAILURE',

  // MFA verification flow
  VERIFY_MFA_REQUEST = '@auth/VERIFY_MFA_REQUEST',
  VERIFY_MFA_SUCCESS = '@auth/VERIFY_MFA_SUCCESS',
  VERIFY_MFA_FAILURE = '@auth/VERIFY_MFA_FAILURE'
}

/**
 * Interface defining the shape of authentication state in Redux store
 * Includes comprehensive authentication status tracking
 */
export interface AuthState {
  /** Currently authenticated user or null */
  user: IUser | null;
  
  /** Authentication tokens */
  tokens: {
    accessToken: string;
    refreshToken: string;
  } | null;
  
  /** Loading state for async operations */
  loading: boolean;
  
  /** Error state for failed operations */
  error: {
    code: string;
    message: string;
  } | null;
  
  /** Flag indicating if user is authenticated */
  isAuthenticated: boolean;
  
  /** Flag indicating if MFA verification is required */
  mfaRequired: boolean;
  
  /** MFA setup data when configuring MFA */
  mfaSetup: {
    secret: string;
    qrCode: string;
  } | null;
  
  /** Flag indicating if user's email is verified */
  emailVerified: boolean;
}

// Login action types
export interface LoginRequestAction extends Action {
  type: AuthActionTypes.LOGIN_REQUEST;
  payload: LoginCredentials;
}

export interface LoginSuccessAction extends Action {
  type: AuthActionTypes.LOGIN_SUCCESS;
  payload: AuthResponse;
}

export interface LoginFailureAction extends Action {
  type: AuthActionTypes.LOGIN_FAILURE;
  payload: { code: string; message: string };
}

// Registration action types
export interface RegisterRequestAction extends Action {
  type: AuthActionTypes.REGISTER_REQUEST;
  payload: RegistrationData;
}

export interface RegisterSuccessAction extends Action {
  type: AuthActionTypes.REGISTER_SUCCESS;
  payload: AuthResponse;
}

export interface RegisterFailureAction extends Action {
  type: AuthActionTypes.REGISTER_FAILURE;
  payload: { code: string; message: string };
}

// Logout action type
export interface LogoutAction extends Action {
  type: AuthActionTypes.LOGOUT;
}

// Token refresh action types
export interface RefreshTokenRequestAction extends Action {
  type: AuthActionTypes.REFRESH_TOKEN_REQUEST;
}

export interface RefreshTokenSuccessAction extends Action {
  type: AuthActionTypes.REFRESH_TOKEN_SUCCESS;
  payload: { accessToken: string; refreshToken: string };
}

export interface RefreshTokenFailureAction extends Action {
  type: AuthActionTypes.REFRESH_TOKEN_FAILURE;
  payload: { code: string; message: string };
}

// Email verification action types
export interface VerifyEmailRequestAction extends Action {
  type: AuthActionTypes.VERIFY_EMAIL_REQUEST;
  payload: string; // verification token
}

export interface VerifyEmailSuccessAction extends Action {
  type: AuthActionTypes.VERIFY_EMAIL_SUCCESS;
}

export interface VerifyEmailFailureAction extends Action {
  type: AuthActionTypes.VERIFY_EMAIL_FAILURE;
  payload: { code: string; message: string };
}

// MFA setup action types
export interface SetupMFARequestAction extends Action {
  type: AuthActionTypes.SETUP_MFA_REQUEST;
}

export interface SetupMFASuccessAction extends Action {
  type: AuthActionTypes.SETUP_MFA_SUCCESS;
  payload: MFASetupData;
}

export interface SetupMFAFailureAction extends Action {
  type: AuthActionTypes.SETUP_MFA_FAILURE;
  payload: { code: string; message: string };
}

// MFA verification action types
export interface VerifyMFARequestAction extends Action {
  type: AuthActionTypes.VERIFY_MFA_REQUEST;
  payload: string; // MFA token
}

export interface VerifyMFASuccessAction extends Action {
  type: AuthActionTypes.VERIFY_MFA_SUCCESS;
  payload: AuthResponse;
}

export interface VerifyMFAFailureAction extends Action {
  type: AuthActionTypes.VERIFY_MFA_FAILURE;
  payload: { code: string; message: string };
}

/**
 * Union type of all possible authentication actions
 * Used for type-safe action handling in reducers
 */
export type AuthAction =
  | LoginRequestAction
  | LoginSuccessAction
  | LoginFailureAction
  | RegisterRequestAction
  | RegisterSuccessAction
  | RegisterFailureAction
  | LogoutAction
  | RefreshTokenRequestAction
  | RefreshTokenSuccessAction
  | RefreshTokenFailureAction
  | VerifyEmailRequestAction
  | VerifyEmailSuccessAction
  | VerifyEmailFailureAction
  | SetupMFARequestAction
  | SetupMFASuccessAction
  | SetupMFAFailureAction
  | VerifyMFARequestAction
  | VerifyMFASuccessAction
  | VerifyMFAFailureAction;