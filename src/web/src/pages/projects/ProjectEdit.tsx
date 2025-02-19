import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { debounce } from 'lodash';
import ProjectForm from '../../components/projects/ProjectForm';
import { projectService } from '../../services/project.service';
import { IProject, IProjectUpdateDTO } from '../../interfaces/project.interface';
import Loading from '../../components/common/Loading';
import Toast from '../../components/common/Toast';
import { handleApiError } from '../../utils/error.util';
import { ERROR_MESSAGES, ERROR_SEVERITY_LEVELS } from '../../constants/error.constants';

/**
 * ProjectEdit component for editing existing projects
 * Implements comprehensive error handling, optimistic updates, and accessibility
 */
const ProjectEdit: React.FC = () => {
  // State management
  const [project, setProject] = useState<IProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; severity: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Hooks
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  // Fetch project data with error handling
  const fetchProject = useCallback(async () => {
    if (!id) {
      setError({
        message: ERROR_MESSAGES.VALIDATION.INVALID_REFERENCE,
        severity: ERROR_SEVERITY_LEVELS.ERROR
      });
      return;
    }

    try {
      setIsLoading(true);
      const projectData = await projectService.getProjectById(id);
      
      if (mountedRef.current) {
        setProject(projectData);
        setError(null);
      }
    } catch (err) {
      const apiError = handleApiError(err);
      if (mountedRef.current) {
        setError({
          message: apiError.message,
          severity: apiError.severity
        });
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [id]);

  // Debounced project update handler
  const handleProjectUpdate = useCallback(
    debounce(async (projectData: IProjectUpdateDTO) => {
      if (!id || !project) return;

      try {
        setIsSaving(true);
        await projectService.updateProject(id, projectData);
        
        if (mountedRef.current) {
          setError({
            message: 'Project updated successfully',
            severity: ERROR_SEVERITY_LEVELS.INFO
          });
          navigate('/projects');
        }
      } catch (err) {
        const apiError = handleApiError(err);
        if (mountedRef.current) {
          setError({
            message: apiError.message,
            severity: apiError.severity
          });
        }
      } finally {
        if (mountedRef.current) {
          setIsSaving(false);
        }
      }
    }, 300),
    [id, project, navigate]
  );

  // Handle form submission
  const handleSubmit = useCallback(async (projectData: IProjectUpdateDTO) => {
    await handleProjectUpdate(projectData);
  }, [handleProjectUpdate]);

  // Handle form cancellation
  const handleCancel = useCallback(() => {
    navigate('/projects');
  }, [navigate]);

  // Initial data fetch
  useEffect(() => {
    fetchProject();

    return () => {
      mountedRef.current = false;
      handleProjectUpdate.cancel();
    };
  }, [fetchProject, handleProjectUpdate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="project-edit__loading" role="status">
        <Loading 
          size="large"
          text="Loading project details..."
          overlay={true}
          testId="project-edit-loading"
        />
      </div>
    );
  }

  // Error state
  if (error && !project) {
    return (
      <div className="project-edit__error" role="alert">
        <Toast
          message={error.message}
          severity={error.severity as typeof ERROR_SEVERITY_LEVELS[keyof typeof ERROR_SEVERITY_LEVELS]}
          onClose={() => setError(null)}
        />
      </div>
    );
  }

  // Main render
  return (
    <div className="project-edit" role="main" aria-label="Edit Project">
      <header className="project-edit__header">
        <h1 className="project-edit__title">
          Edit Project: {project?.name}
        </h1>
      </header>

      {project && (
        <ProjectForm
          project={project}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSaving}
          initialValidation={true}
          enableOptimisticUpdates={true}
          locale="en"
          theme="light"
        />
      )}

      {error && (
        <Toast
          message={error.message}
          severity={error.severity as typeof ERROR_SEVERITY_LEVELS[keyof typeof ERROR_SEVERITY_LEVELS]}
          onClose={() => setError(null)}
        />
      )}
    </div>
  );
};

export default ProjectEdit;