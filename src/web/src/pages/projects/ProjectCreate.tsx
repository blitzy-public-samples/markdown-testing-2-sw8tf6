import React, { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectForm from '../../components/projects/ProjectForm';
import { IProjectCreateDTO } from '../../interfaces/project.interface';
import { projectService } from '../../services/project.service';
import useNotification from '../../hooks/useNotification';
import { ERROR_MESSAGES } from '../../constants/error.constants';

/**
 * ProjectCreate component for creating new projects
 * Implements comprehensive validation, error handling, and performance optimization
 * @version 1.0.0
 */
const ProjectCreate: React.FC = React.memo(() => {
  // Hooks initialization
  const navigate = useNavigate();
  const { notifications, markAsRead } = useNotification();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    startTime: number;
    endTime: number | null;
  }>({ startTime: 0, endTime: null });

  // Performance monitoring
  useEffect(() => {
    // Record component mount time for performance tracking
    const mountTime = performance.now();
    setPerformanceMetrics(prev => ({ ...prev, startTime: mountTime }));

    return () => {
      // Record component unmount time
      const unmountTime = performance.now();
      setPerformanceMetrics(prev => ({ ...prev, endTime: unmountTime }));

      // Log performance metrics if needed
      if (process.env.NODE_ENV === 'development') {
        console.log('Project Create Performance:', {
          totalTime: unmountTime - performanceMetrics.startTime,
          timeUnit: 'ms'
        });
      }
    };
  }, []);

  /**
   * Handles project creation with error handling and performance tracking
   * @param projectData - Project creation data
   */
  const handleCreateProject = useCallback(async (projectData: IProjectCreateDTO) => {
    const startTime = performance.now();
    setIsLoading(true);

    try {
      // Create project
      const createdProject = await projectService.createProject(projectData);

      // Track creation time
      const endTime = performance.now();
      const creationTime = endTime - startTime;

      // Log performance metrics if exceeding threshold
      if (creationTime > 3000) { // 3 seconds threshold as per requirements
        console.warn('Project creation exceeded performance threshold:', {
          creationTime,
          projectId: createdProject.id
        });
      }

      // Show success notification
      notifications.current?.push({
        type: 'success',
        title: 'Project Created',
        message: `Project "${createdProject.name}" has been created successfully.`,
        duration: 5000
      });

      // Navigate to project details
      navigate(`/projects/${createdProject.id}`);
    } catch (error) {
      // Handle specific error types
      if (error instanceof Error) {
        notifications.current?.push({
          type: 'error',
          title: 'Project Creation Failed',
          message: error.message || ERROR_MESSAGES.BUSINESS.OPERATION_INVALID,
          duration: 7000
        });
      } else {
        notifications.current?.push({
          type: 'error',
          title: 'Project Creation Failed',
          message: ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR,
          duration: 7000
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate, notifications]);

  /**
   * Handles cancellation of project creation
   */
  const handleCancel = useCallback(() => {
    // Clear any existing notifications
    if (notifications.current?.length) {
      markAsRead(notifications.current.map(n => n.id));
    }
    navigate('/projects');
  }, [navigate, notifications, markAsRead]);

  return (
    <div 
      className="project-create-container"
      role="main"
      aria-label="Create Project Page"
      aria-busy={isLoading}
    >
      <div className="project-create-header">
        <h1 className="project-create-title">Create New Project</h1>
        <p className="project-create-description">
          Enter project details to create a new project. All fields marked with * are required.
        </p>
      </div>

      <ProjectForm
        onSubmit={handleCreateProject}
        onCancel={handleCancel}
        isLoading={isLoading}
        initialValidation={true}
        enableOptimisticUpdates={true}
        locale="en"
        theme="light"
      />

      {/* Accessibility announcement region */}
      <div 
        className="sr-only" 
        role="status" 
        aria-live="polite"
      >
        {isLoading ? 'Creating project...' : ''}
      </div>
    </div>
  );
});

ProjectCreate.displayName = 'ProjectCreate';

export default ProjectCreate;