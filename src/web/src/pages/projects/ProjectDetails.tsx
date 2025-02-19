import React, { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useParams } from 'react-router-dom'; // ^6.0.0
import { useSelector } from 'react-redux'; // ^9.0.0
import { useInView } from 'react-intersection-observer'; // ^9.0.0
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0
import styled from 'styled-components';
import { IProject, ProjectStatus } from '../../interfaces/project.interface';
import { ProjectMetrics } from '../../components/projects/ProjectMetrics';
import { useWebSocket, ConnectionState } from '../../hooks/useWebSocket';
import Card from '../../components/common/Card';
import ProgressBar from '../../components/common/ProgressBar';

// Styled components with responsive design
const ResponsiveContainer = styled.div`
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);

  @media (max-width: 768px) {
    padding: var(--spacing-md);
    gap: var(--spacing-md);
  }
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);

  @media (max-width: 576px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--spacing-lg);

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
`;

const ProjectTitle = styled.h1`
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0;
`;

const ProjectStatus = styled.div<{ $status: ProjectStatus }>`
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-md);
  font-weight: var(--font-weight-medium);
  background-color: ${({ $status }) => {
    switch ($status) {
      case ProjectStatus.ACTIVE: return 'var(--color-success-light)';
      case ProjectStatus.BLOCKED: return 'var(--color-error-light)';
      case ProjectStatus.COMPLETED: return 'var(--color-info-light)';
      default: return 'var(--color-gray-light)';
    }
  }};
  color: ${({ $status }) => {
    switch ($status) {
      case ProjectStatus.ACTIVE: return 'var(--color-success-dark)';
      case ProjectStatus.BLOCKED: return 'var(--color-error-dark)';
      case ProjectStatus.COMPLETED: return 'var(--color-info-dark)';
      default: return 'var(--color-gray-dark)';
    }
  }};
`;

// Custom hook for project details management
const useProjectDetails = (projectId: string) => {
  const [project, setProject] = useState<IProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { 
    isConnected, 
    connectionState, 
    subscribe, 
    unsubscribe 
  } = useWebSocket(true);

  // Handle real-time project updates
  const handleProjectUpdate = useCallback((updatedProject: IProject) => {
    if (updatedProject.id === projectId) {
      setProject(prev => ({
        ...prev,
        ...updatedProject,
        lastUpdated: new Date()
      }));
    }
  }, [projectId]);

  useEffect(() => {
    if (isConnected) {
      subscribe('project:updated', handleProjectUpdate);
      subscribe('project:deleted', (deletedId: string) => {
        if (deletedId === projectId) {
          setError(new Error('Project has been deleted'));
        }
      });
    }

    return () => {
      unsubscribe('project:updated', handleProjectUpdate);
      unsubscribe('project:deleted', () => {});
    };
  }, [isConnected, projectId, subscribe, unsubscribe, handleProjectUpdate]);

  return { project, loading, error, isConnected, connectionState };
};

// Error Fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { 
  error: Error; 
  resetErrorBoundary: () => void; 
}) => (
  <Card variant="outlined" padding="lg">
    <h2>Error Loading Project</h2>
    <p>{error.message}</p>
    <button onClick={resetErrorBoundary}>Retry</button>
  </Card>
);

// Main component
export const ProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  const { 
    project, 
    loading, 
    error, 
    isConnected, 
    connectionState 
  } = useProjectDetails(projectId!);

  // Memoized connection status indicator
  const ConnectionIndicator = useMemo(() => (
    <div role="status" aria-live="polite">
      {connectionState === ConnectionState.CONNECTED ? (
        <span style={{ color: 'var(--color-success)' }}>●</span>
      ) : connectionState === ConnectionState.CONNECTING ? (
        <span style={{ color: 'var(--color-warning)' }}>●</span>
      ) : (
        <span style={{ color: 'var(--color-error)' }}>●</span>
      )}
    </div>
  ), [connectionState]);

  if (error) {
    throw error;
  }

  if (loading) {
    return (
      <ResponsiveContainer>
        <Card variant="elevated" padding="lg">
          <ProgressBar value={100} animated />
        </Card>
      </ResponsiveContainer>
    );
  }

  if (!project) {
    return (
      <ResponsiveContainer>
        <Card variant="outlined" padding="lg">
          <h2>Project Not Found</h2>
        </Card>
      </ResponsiveContainer>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ResponsiveContainer ref={ref}>
        <HeaderSection>
          <div>
            <ProjectTitle>{project.name}</ProjectTitle>
            <ProjectStatus $status={project.status}>
              {project.status}
            </ProjectStatus>
          </div>
          {ConnectionIndicator}
        </HeaderSection>

        {inView && (
          <>
            <Suspense fallback={<ProgressBar value={100} animated />}>
              <ProjectMetrics 
                project={project}
                onRefresh={() => {}} // Implement refresh logic
              />
            </Suspense>

            <ContentGrid>
              <Card variant="elevated" padding="lg">
                <h2>Project Description</h2>
                <p>{project.description}</p>
              </Card>

              <Card variant="elevated" padding="lg">
                <h2>Team Members</h2>
                <div>
                  {project.members.map(member => (
                    <div key={member.id}>
                      {member.name} - {member.role}
                    </div>
                  ))}
                </div>
              </Card>
            </ContentGrid>
          </>
        )}
      </ResponsiveContainer>
    </ErrorBoundary>
  );
};

export default ProjectDetails;