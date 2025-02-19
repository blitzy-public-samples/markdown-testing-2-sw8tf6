import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components'; // ^6.0.0
import { io, Socket } from 'socket.io-client'; // ^4.0.0
import Card from '../common/Card';
import { DashboardMetrics, MetricsData } from './DashboardMetrics';
import { ITask, TaskStatus, TaskPriority } from '../../interfaces/task.interface';
import { IProject, ProjectStatus } from '../../interfaces/project.interface';

// Types
interface DashboardSummaryProps {
  initialTasks: ITask[];
  initialProjects: IProject[];
  refreshInterval?: number;
  className?: string;
}

interface WebSocketUpdate {
  type: 'TASK_UPDATE' | 'PROJECT_UPDATE';
  data: ITask | IProject;
}

// Styled Components
const StyledDashboardContainer = styled.section`
  display: grid;
  gap: var(--spacing-lg);
  padding: var(--spacing-layout-md);
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: var(--spacing-layout-sm);
  }
`;

const StyledSummarySection = styled(Card)`
  background-color: ${({ theme }) => theme.colors.background};
  transition: box-shadow var(--transition-normal);
  
  &:hover {
    box-shadow: var(--shadow-md);
  }
`;

const StyledHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
`;

const StyledTitle = styled.h2`
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const StyledUpdateIndicator = styled.span<{ $isUpdating: boolean }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: var(--border-radius-full);
  background-color: ${({ $isUpdating, theme }) => 
    $isUpdating ? theme.colors.success : theme.colors.neutral};
  transition: background-color var(--transition-normal);
`;

// WebSocket connection management
const useWebSocketConnection = (url: string): Socket | null => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(url, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [url]);

  return socket;
};

// Main Component
const DashboardSummary: React.FC<DashboardSummaryProps> = ({
  initialTasks,
  initialProjects,
  refreshInterval = 30000,
  className
}) => {
  const [tasks, setTasks] = useState<ITask[]>(initialTasks);
  const [projects, setProjects] = useState<IProject[]>(initialProjects);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // WebSocket connection
  const socket = useWebSocketConnection(process.env.REACT_APP_WS_URL || 'ws://localhost:3001');

  // Memoized metrics calculations
  const metrics = useMemo(() => ({
    totalTasks: tasks.length,
    completedTasks: tasks.filter(task => task.status === TaskStatus.COMPLETED).length,
    highPriorityTasks: tasks.filter(task => task.priority === TaskPriority.HIGH).length,
    activeProjects: projects.filter(project => project.status === ProjectStatus.ACTIVE).length,
    projectProgress: projects.reduce((acc, project) => acc + project.progress, 0) / projects.length
  }), [tasks, projects]);

  // WebSocket update handler
  const handleWebSocketUpdate = useCallback((update: WebSocketUpdate) => {
    setIsUpdating(true);

    if (update.type === 'TASK_UPDATE') {
      setTasks(prevTasks => {
        const taskIndex = prevTasks.findIndex(task => task.id === update.data.id);
        if (taskIndex === -1) return [...prevTasks, update.data as ITask];
        const newTasks = [...prevTasks];
        newTasks[taskIndex] = update.data as ITask;
        return newTasks;
      });
    } else if (update.type === 'PROJECT_UPDATE') {
      setProjects(prevProjects => {
        const projectIndex = prevProjects.findIndex(project => project.id === update.data.id);
        if (projectIndex === -1) return [...prevProjects, update.data as IProject];
        const newProjects = [...prevProjects];
        newProjects[projectIndex] = update.data as IProject;
        return newProjects;
      });
    }

    setTimeout(() => setIsUpdating(false), 1000);
  }, []);

  // WebSocket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('update', handleWebSocketUpdate);
    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    return () => {
      socket.off('update');
      socket.off('connect_error');
    };
  }, [socket, handleWebSocketUpdate]);

  // Metrics update callback
  const handleMetricsCalculated = useCallback((metricsData: MetricsData) => {
    // Trigger any necessary side effects when metrics are calculated
    if (process.env.NODE_ENV === 'development') {
      console.debug('Metrics updated:', metricsData);
    }
  }, []);

  return (
    <StyledDashboardContainer
      className={className}
      role="region"
      aria-label="Dashboard Summary"
    >
      <StyledSummarySection
        variant="elevated"
        padding="lg"
        theme="light"
        ariaLabel="Dashboard Overview"
      >
        <StyledHeader>
          <StyledTitle>Dashboard Overview</StyledTitle>
          <StyledUpdateIndicator $isUpdating={isUpdating} />
        </StyledHeader>

        <DashboardMetrics
          tasks={tasks}
          projects={projects}
          refreshInterval={refreshInterval}
          onMetricsCalculated={handleMetricsCalculated}
        />
      </StyledSummarySection>
    </StyledDashboardContainer>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(DashboardSummary);

// Named exports
export type { DashboardSummaryProps, WebSocketUpdate };