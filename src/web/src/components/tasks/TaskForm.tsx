import React, { useState, useCallback, useEffect } from 'react';
import classNames from 'classnames';
import Input from '../common/Input';
import Select from '../common/Select';
import FileUpload from '../common/FileUpload';
import DatePicker from '../common/DatePicker';
import { ITask, ITaskCreateDTO, ITaskUpdateDTO, TaskPriority, TaskStatus } from '../../interfaces/task.interface';
import { taskService } from '../../services/task.service';
import { validateRequired, validateLength } from '../../utils/validation.util';
import { AppError } from '../../utils/error.util';
import { TASK_RULES } from '../../constants/validation.constants';

interface TaskFormProps {
  task?: ITask;
  onSubmit: (task: ITask) => void;
  onCancel: () => void;
  className?: string;
}

const TaskForm: React.FC<TaskFormProps> = ({
  task,
  onSubmit,
  onCancel,
  className
}) => {
  // Form state
  const [formData, setFormData] = useState<ITaskCreateDTO | ITaskUpdateDTO>({
    title: task?.title || '',
    description: task?.description || '',
    projectId: task?.project?.id || '',
    assigneeId: task?.assignee?.id || '',
    priority: task?.priority || TaskPriority.MEDIUM,
    dueDate: task?.dueDate || new Date(),
    attachments: task?.attachments || [],
    tags: task?.tags || []
  });

  // Form validation and UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Priority options for select
  const priorityOptions = Object.values(TaskPriority).map(priority => ({
    value: priority,
    label: priority.replace('_', ' ').toLowerCase()
  }));

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load task data if editing
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        projectId: task.project.id,
        assigneeId: task.assignee.id,
        priority: task.priority,
        dueDate: task.dueDate,
        attachments: task.attachments,
        tags: task.tags
      });
    }
  }, [task]);

  // Validate form fields
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    TASK_RULES.REQUIRED_FIELDS.forEach(field => {
      const validation = validateRequired(formData[field], field);
      if (!validation.isValid) {
        newErrors[field] = validation.error || `${field} is required`;
      }
    });

    // Title length validation
    const titleValidation = validateLength(
      formData.title,
      TASK_RULES.TITLE_MIN_LENGTH,
      TASK_RULES.TITLE_MAX_LENGTH,
      'Title'
    );
    if (!titleValidation.isValid) {
      newErrors.title = titleValidation.error || 'Invalid title length';
    }

    // Description length validation
    if (formData.description) {
      const descValidation = validateLength(
        formData.description,
        0,
        TASK_RULES.DESCRIPTION_MAX_LENGTH,
        'Description'
      );
      if (!descValidation.isValid) {
        newErrors.description = descValidation.error || 'Description is too long';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form field changes
  const handleChange = useCallback((field: keyof ITaskCreateDTO | ITaskUpdateDTO, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // Handle file uploads
  const handleFileUpload = useCallback(async (files: File[]) => {
    try {
      setAttachments(prev => [...prev, ...files]);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        attachments: 'File upload failed. Please try again.'
      }));
    }
  }, []);

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm() || isSubmitting || isOffline) {
      return;
    }

    setIsSubmitting(true);

    try {
      let result: ITask;

      if (task) {
        // Update existing task
        result = await taskService.updateTask(task.id, formData as ITaskUpdateDTO);
      } else {
        // Create new task
        result = await taskService.createTask(formData as ITaskCreateDTO);
      }

      onSubmit(result);
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError(
        'TASK_SUBMISSION_FAILED',
        'Failed to save task. Please try again.',
        'error',
        { originalError: error }
      );
      setErrors(prev => ({
        ...prev,
        submit: appError.message
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={classNames('task-form', className, {
        'task-form--submitting': isSubmitting,
        'task-form--offline': isOffline
      })}
      noValidate
    >
      <div className="task-form__field">
        <Input
          id="task-title"
          name="title"
          type="text"
          value={formData.title}
          onChange={value => handleChange('title', value)}
          placeholder="Task title"
          required
          error={errors.title}
          disabled={isSubmitting}
          maxLength={TASK_RULES.TITLE_MAX_LENGTH}
        />
      </div>

      <div className="task-form__field">
        <Input
          id="task-description"
          name="description"
          type="text"
          value={formData.description}
          onChange={value => handleChange('description', value)}
          placeholder="Task description"
          error={errors.description}
          disabled={isSubmitting}
          maxLength={TASK_RULES.DESCRIPTION_MAX_LENGTH}
        />
      </div>

      <div className="task-form__field">
        <Select
          options={priorityOptions}
          value={formData.priority}
          onChange={value => handleChange('priority', value)}
          placeholder="Select priority"
          error={!!errors.priority}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="task-form__field">
        <DatePicker
          id="task-due-date"
          name="dueDate"
          value={formData.dueDate}
          onChange={date => handleChange('dueDate', date)}
          required
          error={errors.dueDate}
          disabled={isSubmitting}
          minDate={new Date()}
        />
      </div>

      <div className="task-form__field">
        <FileUpload
          onFileSelect={handleFileUpload}
          maxSize={10 * 1024 * 1024} // 10MB
          allowedMimeTypes={['image/*', 'application/pdf']}
          multiple
          disabled={isSubmitting}
          onError={error => setErrors(prev => ({ ...prev, attachments: error.message }))}
        />
        {errors.attachments && (
          <div className="task-form__error">{errors.attachments}</div>
        )}
      </div>

      {errors.submit && (
        <div className="task-form__error task-form__error--submit">
          {errors.submit}
        </div>
      )}

      <div className="task-form__actions">
        <button
          type="button"
          onClick={onCancel}
          className="task-form__button task-form__button--cancel"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="task-form__button task-form__button--submit"
          disabled={isSubmitting || isOffline}
        >
          {isSubmitting ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  );
};

export default TaskForm;