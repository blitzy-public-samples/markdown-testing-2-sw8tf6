import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../hooks/useAuth';
import { MFASetup } from '../../components/auth/MFASetup';
import { Button } from '../../components/common/Button';
import { PASSWORD_VALIDATION } from '../../constants/auth.constants';
import { ERROR_MESSAGES } from '../../constants/error.constants';
import styles from './Security.module.css';

// Password change form schema with complex validation
const passwordChangeSchema = yup.object().shape({
  currentPassword: yup.string()
    .required(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD),
  newPassword: yup.string()
    .required(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD)
    .min(PASSWORD_VALIDATION.MIN_LENGTH, `Password must be at least ${PASSWORD_VALIDATION.MIN_LENGTH} characters`)
    .max(PASSWORD_VALIDATION.MAX_LENGTH, `Password must be at most ${PASSWORD_VALIDATION.MAX_LENGTH} characters`)
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
    .notOneOf([yup.ref('currentPassword')], 'New password must be different from current password'),
  confirmPassword: yup.string()
    .required(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD)
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
});

interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface SecurityLog {
  id: string;
  eventType: string;
  timestamp: string;
  deviceInfo: string;
  ipAddress: string;
  success: boolean;
}

interface SecurityLogResponse {
  logs: SecurityLog[];
  total: number;
  page: number;
  pageSize: number;
}

const Security: React.FC = () => {
  const { user, setupMFA, updatePassword, getSecurityLogs } = useAuth();
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    total: 0
  });

  // Password change form handling
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordChangeForm>({
    resolver: yupResolver(passwordChangeSchema),
    mode: 'onBlur'
  });

  // Fetch security logs on mount and page change
  useEffect(() => {
    fetchSecurityLogs(pagination.currentPage, pagination.pageSize);
  }, [pagination.currentPage]);

  // Handle password change submission
  const handlePasswordChange = async (data: PasswordChangeForm) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });

      reset();
      // Show success message
      alert('Password successfully updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle MFA setup completion
  const handleMFASetupComplete = useCallback(() => {
    setShowMFASetup(false);
    // Refresh user data to reflect MFA status
    // Show success message
    alert('MFA setup completed successfully');
  }, []);

  // Fetch security activity logs
  const fetchSecurityLogs = async (page: number, pageSize: number) => {
    try {
      setIsLoading(true);
      const response = await getSecurityLogs(page, pageSize);
      setSecurityLogs(response.logs);
      setPagination({
        currentPage: response.page,
        pageSize: response.pageSize,
        total: response.total
      });
    } catch (err) {
      setError('Failed to fetch security logs');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Security Settings</h1>

      {/* Password Change Section */}
      <section className={styles.section}>
        <h2>Change Password</h2>
        <form onSubmit={handleSubmit(handlePasswordChange)} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              {...register('currentPassword')}
              className={styles.input}
              aria-invalid={!!errors.currentPassword}
            />
            {errors.currentPassword && (
              <span className={styles.error}>{errors.currentPassword.message}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              {...register('newPassword')}
              className={styles.input}
              aria-invalid={!!errors.newPassword}
            />
            {errors.newPassword && (
              <span className={styles.error}>{errors.newPassword.message}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              {...register('confirmPassword')}
              className={styles.input}
              aria-invalid={!!errors.confirmPassword}
            />
            {errors.confirmPassword && (
              <span className={styles.error}>{errors.confirmPassword.message}</span>
            )}
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            isDisabled={isLoading}
            fullWidth
          >
            Update Password
          </Button>
        </form>
      </section>

      {/* MFA Section */}
      <section className={styles.section}>
        <h2>Two-Factor Authentication</h2>
        {user?.isMFAEnabled ? (
          <div className={styles.mfaStatus}>
            <p>Two-factor authentication is enabled</p>
            <Button
              variant="outline"
              onClick={() => setShowMFASetup(true)}
              isDisabled={isLoading}
            >
              Reconfigure MFA
            </Button>
          </div>
        ) : (
          <div className={styles.mfaStatus}>
            <p>Enhance your account security by enabling two-factor authentication</p>
            <Button
              onClick={() => setShowMFASetup(true)}
              isDisabled={isLoading}
            >
              Enable Two-Factor Authentication
            </Button>
          </div>
        )}

        {showMFASetup && (
          <MFASetup
            onSetupComplete={handleMFASetupComplete}
            onError={(error) => setError(error)}
          />
        )}
      </section>

      {/* Security Activity Logs */}
      <section className={styles.section}>
        <h2>Security Activity</h2>
        <div className={styles.logsContainer}>
          {securityLogs.map((log) => (
            <div key={log.id} className={styles.logEntry}>
              <div className={styles.logHeader}>
                <span className={styles.logType}>{log.eventType}</span>
                <span className={styles.logTime}>
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              <div className={styles.logDetails}>
                <span>Device: {log.deviceInfo}</span>
                <span>IP: {log.ipAddress}</span>
                <span className={log.success ? styles.success : styles.failure}>
                  {log.success ? 'Successful' : 'Failed'}
                </span>
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          <div className={styles.pagination}>
            <Button
              variant="outline"
              onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
              isDisabled={pagination.currentPage === 1 || isLoading}
            >
              Previous
            </Button>
            <span>
              Page {pagination.currentPage} of {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            <Button
              variant="outline"
              onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
              isDisabled={
                pagination.currentPage >= Math.ceil(pagination.total / pagination.pageSize) || 
                isLoading
              }
            >
              Next
            </Button>
          </div>
        </div>
      </section>

      {/* Error Display */}
      {error && (
        <div className={styles.errorContainer} role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default Security;