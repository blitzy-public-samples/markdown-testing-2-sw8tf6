import { AuthResponse, AuthUser } from '../interfaces/auth.interface';
import { authConfig } from '../config/auth.config';
import jwtDecode from 'jwt-decode'; // v4.0.0
import CryptoJS from 'crypto-js'; // v4.1.1

/**
 * Encryption key generation using configured security parameters
 * @returns {string} Generated encryption key
 */
const generateEncryptionKey = (): string => {
    const { securityConfig } = authConfig;
    const timestamp = new Date().getTime().toString();
    const seed = `${securityConfig.mfaEnabled}-${timestamp}`;
    return CryptoJS.SHA256(seed).toString();
};

/**
 * Securely stores encrypted authentication data in local storage
 * @param {AuthResponse} authData - Authentication data to store
 */
export const storeAuthData = (authData: AuthResponse): void => {
    if (!authData?.accessToken || !authData?.refreshToken) {
        throw new Error('Invalid authentication data');
    }

    const encryptionKey = generateEncryptionKey();
    const { tokenConfig } = authConfig;

    // Encrypt tokens
    const encryptedAccessToken = CryptoJS.AES.encrypt(
        authData.accessToken,
        encryptionKey
    ).toString();

    const encryptedRefreshToken = CryptoJS.AES.encrypt(
        authData.refreshToken,
        encryptionKey
    ).toString();

    // Generate checksums for integrity validation
    const accessTokenChecksum = CryptoJS.SHA256(authData.accessToken).toString();
    const refreshTokenChecksum = CryptoJS.SHA256(authData.refreshToken).toString();

    // Store encrypted data
    localStorage.setItem(
        tokenConfig.tokenStorage.keys.ACCESS_TOKEN,
        encryptedAccessToken
    );
    localStorage.setItem(
        tokenConfig.tokenStorage.keys.REFRESH_TOKEN,
        encryptedRefreshToken
    );

    // Store metadata
    localStorage.setItem('token_version', authData.tokenVersion.toString());
    localStorage.setItem('token_expiry', (Date.now() + authData.expiresIn * 1000).toString());
    localStorage.setItem('encryption_key', encryptionKey);
    localStorage.setItem('access_token_checksum', accessTokenChecksum);
    localStorage.setItem('refresh_token_checksum', refreshTokenChecksum);

    // Store encrypted user data
    if (authData.user) {
        const encryptedUser = CryptoJS.AES.encrypt(
            JSON.stringify(authData.user),
            encryptionKey
        ).toString();
        localStorage.setItem(tokenConfig.tokenStorage.keys.USER, encryptedUser);
    }
};

/**
 * Retrieves and decrypts stored authentication data
 * @returns {AuthResponse | null} Decrypted authentication data or null if invalid
 */
export const getStoredAuthData = (): AuthResponse | null => {
    try {
        const encryptionKey = localStorage.getItem('encryption_key');
        if (!encryptionKey) return null;

        const { tokenConfig } = authConfig;

        // Retrieve encrypted data
        const encryptedAccessToken = localStorage.getItem(
            tokenConfig.tokenStorage.keys.ACCESS_TOKEN
        );
        const encryptedRefreshToken = localStorage.getItem(
            tokenConfig.tokenStorage.keys.REFRESH_TOKEN
        );
        const encryptedUser = localStorage.getItem(tokenConfig.tokenStorage.keys.USER);

        if (!encryptedAccessToken || !encryptedRefreshToken) return null;

        // Decrypt tokens
        const accessToken = CryptoJS.AES.decrypt(
            encryptedAccessToken,
            encryptionKey
        ).toString(CryptoJS.enc.Utf8);

        const refreshToken = CryptoJS.AES.decrypt(
            encryptedRefreshToken,
            encryptionKey
        ).toString(CryptoJS.enc.Utf8);

        // Validate checksums
        const storedAccessChecksum = localStorage.getItem('access_token_checksum');
        const storedRefreshChecksum = localStorage.getItem('refresh_token_checksum');
        
        const newAccessChecksum = CryptoJS.SHA256(accessToken).toString();
        const newRefreshChecksum = CryptoJS.SHA256(refreshToken).toString();

        if (storedAccessChecksum !== newAccessChecksum || 
            storedRefreshChecksum !== newRefreshChecksum) {
            return null;
        }

        // Decrypt user data
        let user: AuthUser | null = null;
        if (encryptedUser) {
            const decryptedUser = CryptoJS.AES.decrypt(
                encryptedUser,
                encryptionKey
            ).toString(CryptoJS.enc.Utf8);
            user = JSON.parse(decryptedUser);
        }

        const tokenVersion = parseInt(localStorage.getItem('token_version') || '0', 10);
        const expiresIn = Math.floor(
            (parseInt(localStorage.getItem('token_expiry') || '0', 10) - Date.now()) / 1000
        );

        return {
            accessToken,
            refreshToken,
            tokenVersion,
            expiresIn,
            user,
            tokenType: 'Bearer'
        };
    } catch (error) {
        console.error('Error retrieving auth data:', error);
        return null;
    }
};

/**
 * Validates token integrity, expiration, and version
 * @returns {boolean} Token validity status
 */
export const isTokenValid = (): boolean => {
    try {
        const authData = getStoredAuthData();
        if (!authData?.accessToken) return false;

        // Decode token without verification to check expiration
        const decodedToken: any = jwtDecode(authData.accessToken);
        
        // Check token expiration
        const currentTime = Math.floor(Date.now() / 1000);
        if (decodedToken.exp <= currentTime) return false;

        // Verify token version matches stored version
        const storedVersion = parseInt(localStorage.getItem('token_version') || '0', 10);
        if (decodedToken.version !== storedVersion) return false;

        // Additional security checks
        const { securityConfig } = authConfig;
        if (securityConfig.mfaEnabled && !decodedToken.mfa_verified) return false;

        return true;
    } catch (error) {
        console.error('Error validating token:', error);
        return false;
    }
};

/**
 * Checks if token needs refresh based on configured thresholds
 * @returns {boolean} Token refresh requirement status
 */
export const needsTokenRefresh = (): boolean => {
    try {
        const authData = getStoredAuthData();
        if (!authData) return true;

        const { tokenConfig } = authConfig;
        const currentTime = Math.floor(Date.now() / 1000);
        const tokenExpiry = parseInt(localStorage.getItem('token_expiry') || '0', 10) / 1000;
        
        // Check if within refresh threshold
        const timeUntilExpiry = tokenExpiry - currentTime;
        return timeUntilExpiry <= tokenConfig.refreshThreshold;
    } catch (error) {
        console.error('Error checking token refresh:', error);
        return true;
    }
};

/**
 * Rotates token encryption with new key generation
 * @returns {Promise<boolean>} Success status of rotation
 */
export const rotateTokenEncryption = async (): Promise<boolean> => {
    try {
        const currentAuthData = getStoredAuthData();
        if (!currentAuthData) return false;

        // Generate new encryption key
        const newEncryptionKey = generateEncryptionKey();

        // Re-encrypt with new key
        await storeAuthData({
            ...currentAuthData,
            tokenVersion: currentAuthData.tokenVersion + 1
        });

        // Clean up old encryption data
        localStorage.removeItem('encryption_key');
        
        return true;
    } catch (error) {
        console.error('Error rotating token encryption:', error);
        return false;
    }
};