import { randomBytes, createCipheriv, createDecipheriv, scrypt } from 'crypto';
import { promisify } from 'util';
import * as bcrypt from 'bcryptjs'; // v2.4.3

// Secure constants for encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm' as const;
const SALT_ROUNDS = 12 as const;
const KEY_LENGTH = 32 as const;
const IV_LENGTH = 16 as const;
const AUTH_TAG_LENGTH = 16 as const;

// Interface for encrypted data structure
interface IEncryptedData {
  encryptedData: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

/**
 * Custom error class for encryption-related errors
 */
class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

/**
 * Encrypts data using AES-256-GCM with authentication tag
 * @param data - Data to encrypt (string or Buffer)
 * @param secretKey - Secret key for encryption (string or Buffer)
 * @returns IEncryptedData object containing encrypted data, IV, and auth tag
 * @throws EncryptionError if encryption fails
 */
export async function encrypt(
  data: string | Buffer,
  secretKey: string | Buffer
): Promise<IEncryptedData> {
  try {
    // Input validation
    if (!data || !secretKey) {
      throw new EncryptionError('Data and secret key are required');
    }

    // Convert inputs to buffers if necessary
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const keyBuffer = Buffer.isBuffer(secretKey) ? secretKey : Buffer.from(secretKey);

    // Validate key length
    if (keyBuffer.length !== KEY_LENGTH) {
      throw new EncryptionError(`Secret key must be ${KEY_LENGTH} bytes`);
    }

    // Generate random IV
    const iv = randomBytes(IV_LENGTH);

    // Create cipher and encrypt
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);
    const encryptedData = Buffer.concat([
      cipher.update(dataBuffer),
      cipher.final()
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Clean up sensitive data
    dataBuffer.fill(0);
    keyBuffer.fill(0);

    return {
      encryptedData,
      iv,
      authTag
    };
  } catch (error) {
    throw new EncryptionError(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Decrypts AES-256-GCM encrypted data with authentication
 * @param encryptedData - IEncryptedData object containing encrypted data, IV, and auth tag
 * @param secretKey - Secret key for decryption (string or Buffer)
 * @returns Decrypted data as Buffer
 * @throws EncryptionError if decryption fails
 */
export async function decrypt(
  encryptedData: IEncryptedData,
  secretKey: string | Buffer
): Promise<Buffer> {
  try {
    // Input validation
    if (!encryptedData || !secretKey) {
      throw new EncryptionError('Encrypted data and secret key are required');
    }

    // Validate encrypted data structure
    if (!encryptedData.encryptedData || !encryptedData.iv || !encryptedData.authTag) {
      throw new EncryptionError('Invalid encrypted data structure');
    }

    // Convert key to buffer if necessary
    const keyBuffer = Buffer.isBuffer(secretKey) ? secretKey : Buffer.from(secretKey);

    // Validate lengths
    if (keyBuffer.length !== KEY_LENGTH) {
      throw new EncryptionError(`Secret key must be ${KEY_LENGTH} bytes`);
    }
    if (encryptedData.iv.length !== IV_LENGTH) {
      throw new EncryptionError(`IV must be ${IV_LENGTH} bytes`);
    }

    // Create decipher
    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      keyBuffer,
      encryptedData.iv
    );
    decipher.setAuthTag(encryptedData.authTag);

    // Decrypt data
    const decryptedData = Buffer.concat([
      decipher.update(encryptedData.encryptedData),
      decipher.final()
    ]);

    // Clean up sensitive data
    keyBuffer.fill(0);

    return decryptedData;
  } catch (error) {
    throw new EncryptionError(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Securely hashes passwords using bcrypt
 * @param password - Plain text password to hash
 * @returns Promise resolving to hashed password
 * @throws EncryptionError if hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    if (!password) {
      throw new EncryptionError('Password is required');
    }

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Clean up sensitive data
    password = '';
    return hashedPassword;
  } catch (error) {
    throw new EncryptionError(
      `Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Securely compares passwords using timing-safe comparison
 * @param plainPassword - Plain text password to compare
 * @param hashedPassword - Bcrypt hashed password to compare against
 * @returns Promise resolving to boolean indicating match
 * @throws EncryptionError if comparison fails
 */
export async function comparePasswords(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    if (!plainPassword || !hashedPassword) {
      throw new EncryptionError('Both passwords are required for comparison');
    }

    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);

    // Clean up sensitive data
    plainPassword = '';
    return isMatch;
  } catch (error) {
    throw new EncryptionError(
      `Password comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generates a cryptographically secure random key
 * @param length - Length of key to generate in bytes
 * @returns Promise resolving to secure random key buffer
 * @throws EncryptionError if key generation fails
 */
export async function generateSecureKey(length: number = KEY_LENGTH): Promise<Buffer> {
  try {
    if (length <= 0) {
      throw new EncryptionError('Key length must be positive');
    }

    return randomBytes(length);
  } catch (error) {
    throw new EncryptionError(
      `Key generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Clean up process memory before exit
process.on('exit', () => {
  try {
    // Clear any sensitive data in global scope
    // This is a best-effort cleanup
    global.gc?.();
  } catch (error) {
    // Ignore cleanup errors on exit
  }
});