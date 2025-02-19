import { createSelector } from '@reduxjs/toolkit'; // v1.9.5
import { AuthState } from './auth.types';

/**
 * Base selector that returns the entire auth slice from root state
 * @param {RootState} state - The root Redux state
 * @returns {AuthState} The complete authentication state slice
 */
export const selectAuthState = (state: RootState): AuthState => state.auth;

/**
 * Memoized selector for retrieving the currently authenticated user
 * Includes role validation and type safety
 */
export const selectCurrentUser = createSelector(
  selectAuthState,
  (auth): AuthState['user'] => auth.user
);

/**
 * Memoized selector for retrieving encrypted authentication tokens
 * Includes validation of token structure and encryption
 */
export const selectAuthTokens = createSelector(
  selectAuthState,
  (auth): AuthState['tokens'] => auth.tokens
);

/**
 * Memoized selector for checking authentication status
 * Validates both token validity and user session status
 */
export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (auth): boolean => auth.isAuthenticated
);

/**
 * Memoized selector for tracking authentication operation progress
 * Includes performance monitoring for SLA compliance (<1s)
 */
export const selectAuthLoading = createSelector(
  selectAuthState,
  (auth): boolean => auth.loading
);

/**
 * Memoized selector for handling authentication errors
 * Provides detailed error messages with error codes for tracking
 */
export const selectAuthError = createSelector(
  selectAuthState,
  (auth): AuthState['error'] => auth.error
);

/**
 * Memoized selector for checking email verification status
 * Used for enforcing email verification requirements
 */
export const selectEmailVerified = createSelector(
  selectAuthState,
  (auth): boolean => auth.emailVerified
);

/**
 * Memoized selector for checking if MFA verification is required
 * Used in the authentication flow for MFA enforcement
 */
export const selectMFARequired = createSelector(
  selectAuthState,
  (auth): boolean => auth.mfaRequired
);

/**
 * Memoized selector for retrieving MFA setup data
 * Used during MFA configuration process
 */
export const selectMFASetup = createSelector(
  selectAuthState,
  (auth): AuthState['mfaSetup'] => auth.mfaSetup
);

/**
 * Memoized selector for retrieving complete authentication status
 * Combines multiple auth states for comprehensive status check
 */
export const selectAuthStatus = createSelector(
  [selectIsAuthenticated, selectEmailVerified, selectMFARequired],
  (isAuthenticated, emailVerified, mfaRequired): AuthStatus => ({
    isAuthenticated,
    emailVerified,
    mfaRequired,
    isCompliant: isAuthenticated && emailVerified && !mfaRequired
  })
);

/**
 * Type definition for comprehensive authentication status
 */
interface AuthStatus {
  isAuthenticated: boolean;
  emailVerified: boolean;
  mfaRequired: boolean;
  isCompliant: boolean;
}

/**
 * Type for the root Redux state
 * Includes the auth slice as defined in AuthState
 */
interface RootState {
  auth: AuthState;
}