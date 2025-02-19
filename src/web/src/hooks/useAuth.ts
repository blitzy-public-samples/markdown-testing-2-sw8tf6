import { useDispatch, useSelector } from 'react-redux'; // ^8.1.1
import { useCallback, useEffect, useRef } from 'react'; // ^18.2.0
import {
  LoginCredentials,
  RegistrationData,
  AuthResponse,
  PasswordResetData,
  MFASetupData,
  DeviceInfo,
  TokenData
} from '../interfaces/auth.interface';
import {
  login,
  register,
  logout,
  refreshToken,
  verifyEmail,
  setupMFA,
  validateMFA,
  resendVerification,
  generateRecoveryCodes
} from '../store/auth/auth.actions';
import {
  selectCurrentUser,
  selectAuthLoading,
  selectAuthError,
  selectIsAuthenticated,
  selectMFARequired,
  selectEmailVerified,
  selectAuthStatus,
  selectMFASetup
} from '../store/auth/auth.selectors';
import { ERROR_MESSAGES } from '../constants/error.constants';
import { authConfig } from '../config/auth.config';
import { AUTH_STORAGE_KEYS, AUTH_TIMEOUTS } from '../constants/auth.constants';

/**
 * Enhanced authentication hook providing comprehensive auth functionality
 * Includes MFA, email verification, and secure session management
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  
  // Selectors for auth state
  const user = useSelector(selectCurrentUser);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const mfaRequired = useSelector(selectMFARequired);
  const emailVerified = useSelector(selectEmailVerified);
  const authStatus = useSelector(selectAuthStatus);
  const mfaSetup = useSelector(selectMFASetup);

  // Refs for session management
  const sessionTimeoutRef = useRef<NodeJS.Timeout>();
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  /**
   * Generates device fingerprint for enhanced security
   */
  const generateDeviceFingerprint = useCallback(async (): Promise<string> => {
    const components = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset(),
      screen.colorDepth,
      navigator.hardwareConcurrency
    ];
    
    const fingerprint = components.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }, []);

  /**
   * Enhanced login with MFA and device tracking
   */
  const handleLogin = useCallback(async (credentials: LoginCredentials) => {
    try {
      const deviceFingerprint = await generateDeviceFingerprint();
      const deviceInfo: DeviceInfo = {
        fingerprint: deviceFingerprint,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };

      await dispatch(login({ ...credentials, deviceInfo }));
      initializeSessionMonitoring();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Enhanced registration with email verification
   */
  const handleRegister = useCallback(async (data: RegistrationData) => {
    try {
      await dispatch(register(data));
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Secure logout with session cleanup
   */
  const handleLogout = useCallback(async () => {
    try {
      await dispatch(logout());
      cleanupSession();
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * MFA setup with recovery codes
   */
  const handleMFASetup = useCallback(async (): Promise<MFASetupData> => {
    try {
      const setupData = await dispatch(setupMFA());
      const recoveryCodes = await dispatch(generateRecoveryCodes());
      return { ...setupData, recoveryCodes };
    } catch (error) {
      console.error('MFA setup failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Email verification handler
   */
  const handleVerifyEmail = useCallback(async (token: string) => {
    try {
      await dispatch(verifyEmail(token));
    } catch (error) {
      console.error('Email verification failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Initializes session monitoring and token refresh
   */
  const initializeSessionMonitoring = useCallback(() => {
    // Clear any existing timers
    cleanupSession();

    // Set up session timeout
    sessionTimeoutRef.current = setInterval(() => {
      const inactiveTime = Date.now() - lastActivityRef.current;
      if (inactiveTime >= AUTH_TIMEOUTS.SESSION_TIMEOUT * 1000) {
        handleLogout();
      }
    }, 60000); // Check every minute

    // Set up token refresh
    tokenRefreshIntervalRef.current = setInterval(() => {
      dispatch(refreshToken());
    }, authConfig.tokenConfig.refreshThreshold * 1000);

    // Set up activity listener
    document.addEventListener('mousemove', updateLastActivity);
    document.addEventListener('keypress', updateLastActivity);
  }, [dispatch, handleLogout]);

  /**
   * Updates last activity timestamp
   */
  const updateLastActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  /**
   * Cleans up session monitoring
   */
  const cleanupSession = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearInterval(sessionTimeoutRef.current);
    }
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
    }
    document.removeEventListener('mousemove', updateLastActivity);
    document.removeEventListener('keypress', updateLastActivity);
  }, [updateLastActivity]);

  // Initialize session monitoring on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      initializeSessionMonitoring();
    }
    return cleanupSession;
  }, [isAuthenticated, initializeSessionMonitoring, cleanupSession]);

  return {
    // Auth state
    user,
    isAuthenticated,
    loading,
    error,
    mfaRequired,
    emailVerified,
    authStatus,
    mfaSetup,

    // Auth operations
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    verifyEmail: handleVerifyEmail,
    setupMFA: handleMFASetup,
    validateMFA: (token: string) => dispatch(validateMFA(token)),
    generateRecoveryCodes: () => dispatch(generateRecoveryCodes()),
    resendVerification: () => dispatch(resendVerification())
  };
};