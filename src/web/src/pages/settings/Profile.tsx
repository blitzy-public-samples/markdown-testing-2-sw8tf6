import React, { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { IUser, IUserProfile } from '../../interfaces/user.interface';
import FileUpload from '../../components/common/FileUpload';
import { Button } from '../../components/common/Button';
import styles from './Profile.module.css';

// Constants for validation and configuration
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png'];
const DEBOUNCE_DELAY = 300;

interface ProfileProps {
  currentUser: IUser;
  onProfileUpdate: (profile: IUserProfile) => Promise<void>;
}

const Profile: React.FC<ProfileProps> = ({ currentUser, onProfileUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(currentUser.avatar);

  // Form validation and handling using react-hook-form
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset
  } = useForm<IUserProfile>({
    defaultValues: {
      name: currentUser.name,
      email: currentUser.email,
      avatar: currentUser.avatar
    },
    mode: 'onChange'
  });

  // Reset form when currentUser changes
  useEffect(() => {
    reset({
      name: currentUser.name,
      email: currentUser.email,
      avatar: currentUser.avatar
    });
    setAvatarPreview(currentUser.avatar);
  }, [currentUser, reset]);

  // Handle avatar upload
  const handleAvatarUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    try {
      // Create object URL for preview
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);

      // Prepare form data for upload
      const formData = new FormData();
      formData.append('avatar', file);

      // Make API call to upload avatar
      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Avatar upload failed');

      const { avatarUrl } = await response.json();
      
      // Update form with new avatar URL
      reset({ ...currentUser, avatar: avatarUrl });
      toast.success('Avatar updated successfully');
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Failed to upload avatar');
      setAvatarPreview(currentUser.avatar);
    }
  }, [currentUser, reset]);

  // Handle avatar upload errors
  const handleAvatarError = useCallback((error: { code: string; message: string }) => {
    toast.error(error.message);
  }, []);

  // Handle form submission
  const onSubmit = async (data: IUserProfile) => {
    setIsUpdating(true);
    try {
      await onProfileUpdate(data);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={styles.profileContainer}>
      <h1 className={styles.title}>Profile Settings</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        {/* Avatar Section */}
        <div className={styles.avatarSection}>
          <div className={styles.avatarPreview}>
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={`${currentUser.name}'s avatar`}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <FileUpload
            onFileSelect={handleAvatarUpload}
            maxSize={MAX_AVATAR_SIZE}
            allowedMimeTypes={ALLOWED_AVATAR_TYPES}
            onError={handleAvatarError}
            multiple={false}
          />
        </div>

        {/* Name Field */}
        <div className={styles.formGroup}>
          <Controller
            name="name"
            control={control}
            rules={{
              required: 'Name is required',
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
              maxLength: { value: 50, message: 'Name must not exceed 50 characters' }
            }}
            render={({ field }) => (
              <>
                <label htmlFor="name" className={styles.label}>
                  Full Name
                </label>
                <input
                  {...field}
                  id="name"
                  type="text"
                  className={styles.input}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                />
                {errors.name && (
                  <span id="name-error" className={styles.error}>
                    {errors.name.message}
                  </span>
                )}
              </>
            )}
          />
        </div>

        {/* Email Field */}
        <div className={styles.formGroup}>
          <Controller
            name="email"
            control={control}
            rules={{
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            }}
            render={({ field }) => (
              <>
                <label htmlFor="email" className={styles.label}>
                  Email Address
                </label>
                <input
                  {...field}
                  id="email"
                  type="email"
                  className={styles.input}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {errors.email && (
                  <span id="email-error" className={styles.error}>
                    {errors.email.message}
                  </span>
                )}
              </>
            )}
          />
        </div>

        {/* Role Display (Read-only) */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Role</label>
          <input
            type="text"
            value={currentUser.role}
            className={styles.input}
            disabled
            aria-label="User role"
          />
        </div>

        {/* Submit Button */}
        <div className={styles.actions}>
          <Button
            type="submit"
            variant="primary"
            isLoading={isUpdating}
            isDisabled={!isDirty || isUpdating}
            fullWidth
            ariaLabel="Update profile"
          >
            Update Profile
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Profile;