import React, { useState, useCallback, useEffect, useRef } from 'react';
import QRCode from 'qrcode.react'; // ^3.1.0
import { MFASetupData } from '../../interfaces/auth.interface';
import { AuthService } from '../../services/auth.service';
import { Button } from '../common/Button';
import styles from './MFASetup.module.css';

interface MFASetupProps {
  onSetupComplete?: () => void;
  onError?: (error: string) => void;
}

const MFA_CODE_LENGTH = 6;
const MAX_VERIFICATION_ATTEMPTS = 3;
const VERIFICATION_COOLDOWN = 30000; // 30 seconds

export const MFASetup: React.FC<MFASetupProps> = ({ onSetupComplete, onError }) => {
  // State management
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<MFASetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recoveryKeysDisplayed, setRecoveryKeysDisplayed] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [cooldownActive, setCooldownActive] = useState(false);

  // Refs for request deduplication and cleanup
  const setupRequestInProgress = useRef(false);
  const cooldownTimer = useRef<NodeJS.Timeout>();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimer.current) {
        clearTimeout(cooldownTimer.current);
      }
    };
  }, []);

  // Initialize MFA setup
  const handleSetupMFA = useCallback(async () => {
    if (setupRequestInProgress.current) return;
    
    try {
      setLoading(true);
      setError(null);
      setupRequestInProgress.current = true;

      const authService = new AuthService();
      const mfaSetupData = await authService.setupMFA();

      if (!mfaSetupData?.qrCode || !mfaSetupData?.secret || !mfaSetupData?.recoveryKeys) {
        throw new Error('Invalid MFA setup data received');
      }

      setSetupData(mfaSetupData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize MFA setup';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
      setupRequestInProgress.current = false;
    }
  }, [onError]);

  // Handle verification code input
  const handleCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target.value.replace(/[^0-9]/g, '');
    if (input.length <= MFA_CODE_LENGTH) {
      setVerificationCode(input);
      setError(null);
    }
  };

  // Verify MFA code
  const handleVerifyCode = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (cooldownActive || !setupData?.secret) {
      return;
    }

    if (verificationCode.length !== MFA_CODE_LENGTH) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const authService = new AuthService();
      await authService.verifyMFACode(setupData.secret, verificationCode);

      setRecoveryKeysDisplayed(true);
      onSetupComplete?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid verification code';
      setError(errorMessage);
      onError?.(errorMessage);

      setVerificationAttempts(prev => {
        const attempts = prev + 1;
        if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
          setCooldownActive(true);
          cooldownTimer.current = setTimeout(() => {
            setCooldownActive(false);
            setVerificationAttempts(0);
          }, VERIFICATION_COOLDOWN);
        }
        return attempts;
      });
    } finally {
      setLoading(false);
      setVerificationCode('');
    }
  }, [verificationCode, setupData, cooldownActive, onSetupComplete, onError]);

  // Copy recovery keys to clipboard
  const handleCopyRecoveryKeys = async () => {
    if (!setupData?.recoveryKeys) return;

    try {
      await navigator.clipboard.writeText(setupData.recoveryKeys.join('\n'));
    } catch (err) {
      setError('Failed to copy recovery keys. Please copy them manually.');
      onError?.('Failed to copy recovery keys');
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Set Up Two-Factor Authentication</h2>

      {!setupData && (
        <Button
          onClick={handleSetupMFA}
          isLoading={loading}
          isDisabled={loading}
          fullWidth
          ariaLabel="Begin MFA setup"
        >
          Begin Setup
        </Button>
      )}

      {setupData && !recoveryKeysDisplayed && (
        <div className={styles.setupContent}>
          <ol className={styles.instructions}>
            <li>Install an authenticator app on your mobile device</li>
            <li>Scan the QR code below with your authenticator app</li>
            <li>Enter the 6-digit code shown in your app</li>
          </ol>

          <div className={styles.qrCodeContainer} aria-label="QR Code for MFA setup">
            <QRCode
              value={setupData.qrCode}
              size={200}
              level="M"
              includeMargin
              renderAs="svg"
            />
          </div>

          <div className={styles.manualEntry}>
            <p>Can't scan the QR code? Use this code instead:</p>
            <code className={styles.secretCode}>{setupData.secret}</code>
          </div>

          <form onSubmit={handleVerifyCode} className={styles.verificationForm}>
            <div className={styles.inputGroup}>
              <label htmlFor="verificationCode">Enter Verification Code:</label>
              <input
                id="verificationCode"
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={MFA_CODE_LENGTH}
                value={verificationCode}
                onChange={handleCodeChange}
                disabled={loading || cooldownActive}
                aria-invalid={!!error}
                aria-describedby={error ? 'verificationError' : undefined}
                className={styles.codeInput}
              />
            </div>

            {error && (
              <p id="verificationError" className={styles.error} role="alert">
                {error}
              </p>
            )}

            {cooldownActive && (
              <p className={styles.cooldownMessage}>
                Too many attempts. Please try again in 30 seconds.
              </p>
            )}

            <Button
              type="submit"
              isLoading={loading}
              isDisabled={loading || cooldownActive || verificationCode.length !== MFA_CODE_LENGTH}
              fullWidth
              ariaLabel="Verify MFA code"
            >
              Verify Code
            </Button>
          </form>
        </div>
      )}

      {recoveryKeysDisplayed && setupData?.recoveryKeys && (
        <div className={styles.recoveryKeys}>
          <h3>Recovery Keys</h3>
          <p className={styles.recoveryWarning}>
            Store these recovery keys in a secure location. They can be used to regain access to your account if you lose access to your authenticator app.
          </p>

          <div className={styles.keysList} aria-label="Recovery keys">
            {setupData.recoveryKeys.map((key, index) => (
              <div key={index} className={styles.keyItem}>
                {key}
              </div>
            ))}
          </div>

          <Button
            onClick={handleCopyRecoveryKeys}
            variant="secondary"
            fullWidth
            ariaLabel="Copy recovery keys to clipboard"
          >
            Copy Recovery Keys
          </Button>
        </div>
      )}
    </div>
  );
};