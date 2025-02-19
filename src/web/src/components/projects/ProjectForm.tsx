import React, { useState, useCallback, useRef, useEffect } from 'react';
import classNames from 'classnames';
import { IProject, IProjectCreateDTO, IProjectUpdateDTO, ProjectStatus } from '../../interfaces/project.interface';
import { validateProjectCreate, validateProjectUpdate } from '../../validators/project.validator';
import DatePicker from '../common/DatePicker';
import Select from '../common/Select';

interface ProjectFormProps {
  project?: IProject;
  onSubmit: (project: IProjectCreateDTO | IProjectUpdateDTO) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  initialValidation: boolean;
  enableOptimisticUpdates: boolean;
  locale: string;
  theme: 'light' | 'dark';
}

const ProjectForm: React.FC<ProjectFormProps> = React.memo(({
  project,
  onSubmit,
  onCancel,
  isLoading,
  initialValidation = true,
  enableOptimisticUpdates = true,
  locale = 'en',
  theme = 'light'
}) => {
  // Form state management
  const [formData, setFormData] = useState<IProjectCreateDTO | IProjectUpdateDTO>(() => ({
    name: project?.name || '',
    description: project?.description || '',
    startDate: project?.startDate || new Date(),
    endDate: project?.endDate || new Date(),
    priority: project?.priority || 'medium',
    tags: project?.tags || [],
    members: project?.members?.map(member => member.id) || [],
    ...(project && { status: project.status, progress: project.progress })
  }));

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [validationCache] = useState(new Map<string, { result: any; timestamp: number }>());

  // Refs for focus management
  const formRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Priority options for select
  const priorityOptions = [
    { value: 'low', label: 'Low Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'high', label: 'High Priority' }
  ];

  // Status options for existing projects
  const statusOptions = Object.values(ProjectStatus).map(status => ({
    value: status,
    label: status.charAt(0) + status.slice(1).toLowerCase()
  }));

  // Debounced validation
  const validateField = useCallback((name: string, value: any) => {
    const cacheKey = `${name}_${JSON.stringify(value)}`;
    const cached = validationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 5000) {
      return cached.result;
    }

    let error = '';
    const validation = project
      ? validateProjectUpdate({ ...formData, [name]: value }, project)
      : validateProjectCreate({ ...formData, [name]: value });

    if (!validation.isValid) {
      error = validation.errors[0] || 'Invalid value';
    }

    validationCache.set(cacheKey, { result: error, timestamp: Date.now() });
    return error;
  }, [formData, project, validationCache]);

  // Handle field changes with validation
  const handleChange = useCallback((name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
    
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, [validateField]);

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Full form validation
    const validation = project
      ? validateProjectUpdate(formData as IProjectUpdateDTO, project)
      : validateProjectCreate(formData as IProjectCreateDTO);

    if (!validation.isValid) {
      const newErrors = validation.errors.reduce((acc, error, index) => ({
        ...acc,
        [`field_${index}`]: error
      }), {});
      
      setErrors(newErrors);
      
      // Focus first error field
      const firstErrorField = Object.keys(newErrors)[0];
      const errorElement = formRef.current?.querySelector(`[name="${firstErrorField}"]`);
      (errorElement as HTMLElement)?.focus();
      
      return;
    }

    try {
      await onSubmit(formData);
      setIsDirty(false);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        submit: 'Failed to save project. Please try again.'
      }));
    }
  };

  // Handle unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Initial focus
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={classNames('project-form', `theme-${theme}`, {
        'project-form--loading': isLoading
      })}
      noValidate
    >
      <div className="form-group">
        <label htmlFor="name" className="form-label">
          Project Name
          <span className="required-indicator">*</span>
        </label>
        <input
          ref={nameInputRef}
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={e => handleChange('name', e.target.value)}
          className={classNames('form-input', {
            'form-input--error': errors.name
          })}
          required
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          disabled={isLoading}
        />
        {errors.name && (
          <div id="name-error" className="form-error" role="alert">
            {errors.name}
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="description" className="form-label">
          Description
          <span className="required-indicator">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={e => handleChange('description', e.target.value)}
          className={classNames('form-textarea', {
            'form-textarea--error': errors.description
          })}
          required
          aria-required="true"
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
          disabled={isLoading}
        />
        {errors.description && (
          <div id="description-error" className="form-error" role="alert">
            {errors.description}
          </div>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="startDate" className="form-label">
            Start Date
            <span className="required-indicator">*</span>
          </label>
          <DatePicker
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={date => handleChange('startDate', date)}
            error={errors.startDate}
            required
            disabled={isLoading}
            locale={locale}
            mobileOptimized
          />
        </div>

        <div className="form-group">
          <label htmlFor="endDate" className="form-label">
            End Date
            <span className="required-indicator">*</span>
          </label>
          <DatePicker
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={date => handleChange('endDate', date)}
            minDate={formData.startDate}
            error={errors.endDate}
            required
            disabled={isLoading}
            locale={locale}
            mobileOptimized
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="priority" className="form-label">
          Priority
          <span className="required-indicator">*</span>
        </label>
        <Select
          options={priorityOptions}
          value={formData.priority}
          onChange={value => handleChange('priority', value)}
          disabled={isLoading}
          error={!!errors.priority}
          required
          name="priority"
        />
      </div>

      {project && (
        <div className="form-group">
          <label htmlFor="status" className="form-label">
            Status
            <span className="required-indicator">*</span>
          </label>
          <Select
            options={statusOptions}
            value={formData.status}
            onChange={value => handleChange('status', value)}
            disabled={isLoading}
            error={!!errors.status}
            required
            name="status"
          />
        </div>
      )}

      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={classNames('btn btn-primary', {
            'btn--loading': isLoading
          })}
          disabled={isLoading || (initialValidation && Object.keys(errors).length > 0)}
        >
          {isLoading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
        </button>
      </div>

      {errors.submit && (
        <div className="form-error form-error--submit" role="alert">
          {errors.submit}
        </div>
      )}
    </form>
  );
});

ProjectForm.displayName = 'ProjectForm';

export default ProjectForm;