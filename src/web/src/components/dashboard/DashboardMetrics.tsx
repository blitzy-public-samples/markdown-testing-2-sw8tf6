import React, { useCallback, useEffect, useMemo } from 'react';
import styled from 'styled-components'; // ^6.0.0
import Card from '../common/Card';
import ProgressBar from '../common/ProgressBar';
import { ITask, TaskStatus, TaskPriority } from '../../interfaces/task.interface';
import { IProject, ProjectStatus } from '../../interfaces/project.interface';

// Types
interface DashboardMetricsProps {
  tasks: ITask[];
  projects: IProject[];
  refreshInterval?: number;
  onMetricsCalculated?: (metrics: MetricsData) => void;
}

interface MetricsData {
  taskMetrics: TaskMetrics;
  projectMetrics: ProjectMetrics;
  timestamp: Date;
}

interface TaskMetrics {
  total: number;
  completionRate: number;
  statusDistribution: Record<TaskStatus, number>;
  priorityDistribution: Record<TaskPriority, number>;
  overdueTasks: number;
  dueSoonTasks: number;
}

interface ProjectMetrics {
  total: number;
  activeProjects: number;
  averageProgress: number;
  onTrackProjects: number;
  atRiskProjects: number;
  teamUtilization: number;
}

// Styled Components
const StyledMetricsContainer = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${({ theme }) => theme.spacing.medium};
  padding: ${({ theme }) => theme.spacing.large};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const StyledMetricCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.medium};
  min-height: 150px;
  background-color: ${({ theme }) => theme.colors.cardBackground};
`;

const MetricValue = styled.div`
  font-size: ${({ theme }) => theme.typography.xl};
  font-weight: ${({ theme }) => theme.typography.weightBold};
  color: ${({ theme }) => theme.colors.primary};
  margin: ${({ theme }) => theme.spacing.small} 0;
`;

const MetricLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// Memoized calculation functions
const calculateTaskMetrics = (tasks: ITask[]): TaskMetrics => {
  const metrics = {
    total: tasks.length,
    completionRate: 0,
    statusDistribution: Object.values(TaskStatus).reduce((acc, status) => ({
      ...acc,
      [status]: 0
    }), {} as Record<TaskStatus, number>),
    priorityDistribution: Object.values(TaskPriority).reduce((acc, priority) => ({
      ...acc,
      [priority]: 0
    }), {} as Record<TaskPriority, number>),
    overdueTasks: 0,
    dueSoonTasks: 0
  };

  const now = new Date();
  const soonThreshold = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

  tasks.forEach(task => {
    metrics.statusDistribution[task.status]++;
    metrics.priorityDistribution[task.priority]++;

    if (task.status === TaskStatus.COMPLETED) {
      metrics.completionRate++;
    }

    const dueDate = new Date(task.dueDate);
    if (dueDate < now && task.status !== TaskStatus.COMPLETED) {
      metrics.overdueTasks++;
    } else if (dueDate <= soonThreshold && task.status !== TaskStatus.COMPLETED) {
      metrics.dueSoonTasks++;
    }
  });

  metrics.completionRate = metrics.total > 0 
    ? (metrics.completionRate / metrics.total) * 100 
    : 0;

  return metrics;
};

const calculateProjectMetrics = (projects: IProject[]): ProjectMetrics => {
  const metrics = {
    total: projects.length,
    activeProjects: 0,
    averageProgress: 0,
    onTrackProjects: 0,
    atRiskProjects: 0,
    teamUtilization: 0
  };

  let totalProgress = 0;
  let totalTeamMembers = new Set<string>();

  projects.forEach(project => {
    if (project.status === ProjectStatus.ACTIVE) {
      metrics.activeProjects++;
      totalProgress += project.progress;

      const now = new Date();
      const totalDuration = project.endDate.getTime() - project.startDate.getTime();
      const elapsed = now.getTime() - project.startDate.getTime();
      const expectedProgress = (elapsed / totalDuration) * 100;

      if (project.progress >= expectedProgress - 10) {
        metrics.onTrackProjects++;
      } else {
        metrics.atRiskProjects++;
      }

      project.members.forEach(member => totalTeamMembers.add(member.id));
    }
  });

  metrics.averageProgress = metrics.activeProjects > 0 
    ? totalProgress / metrics.activeProjects 
    : 0;
  
  metrics.teamUtilization = totalTeamMembers.size;

  return metrics;
};

// Main Component
const DashboardMetrics: React.FC<DashboardMetricsProps> = ({
  tasks,
  projects,
  refreshInterval = 30000,
  onMetricsCalculated
}) => {
  const taskMetrics = useMemo(() => calculateTaskMetrics(tasks), [tasks]);
  const projectMetrics = useMemo(() => calculateProjectMetrics(projects), [projects]);

  const handleMetricsUpdate = useCallback(() => {
    const metricsData: MetricsData = {
      taskMetrics,
      projectMetrics,
      timestamp: new Date()
    };
    onMetricsCalculated?.(metricsData);
  }, [taskMetrics, projectMetrics, onMetricsCalculated]);

  useEffect(() => {
    handleMetricsUpdate();
    const interval = setInterval(handleMetricsUpdate, refreshInterval);
    return () => clearInterval(interval);
  }, [handleMetricsUpdate, refreshInterval]);

  return (
    <StyledMetricsContainer>
      <StyledMetricCard>
        <MetricLabel>Task Completion Rate</MetricLabel>
        <MetricValue>{taskMetrics.completionRate.toFixed(1)}%</MetricValue>
        <ProgressBar
          value={taskMetrics.completionRate}
          color="var(--color-success)"
          height="0.5rem"
          animated
          label="Task completion progress"
        />
      </StyledMetricCard>

      <StyledMetricCard>
        <MetricLabel>Active Projects</MetricLabel>
        <MetricValue>{projectMetrics.activeProjects}</MetricValue>
        <ProgressBar
          value={(projectMetrics.activeProjects / projectMetrics.total) * 100}
          color="var(--color-primary)"
          height="0.5rem"
          animated
          label="Active projects ratio"
        />
      </StyledMetricCard>

      <StyledMetricCard>
        <MetricLabel>Project Progress</MetricLabel>
        <MetricValue>{projectMetrics.averageProgress.toFixed(1)}%</MetricValue>
        <ProgressBar
          value={projectMetrics.averageProgress}
          color="var(--color-info)"
          height="0.5rem"
          animated
          label="Average project progress"
        />
      </StyledMetricCard>

      <StyledMetricCard>
        <MetricLabel>Tasks Due Soon</MetricLabel>
        <MetricValue>{taskMetrics.dueSoonTasks}</MetricValue>
        <ProgressBar
          value={(taskMetrics.dueSoonTasks / taskMetrics.total) * 100}
          color="var(--color-warning)"
          height="0.5rem"
          animated
          label="Tasks due within 7 days"
        />
      </StyledMetricCard>

      <StyledMetricCard>
        <MetricLabel>Overdue Tasks</MetricLabel>
        <MetricValue>{taskMetrics.overdueTasks}</MetricValue>
        <ProgressBar
          value={(taskMetrics.overdueTasks / taskMetrics.total) * 100}
          color="var(--color-danger)"
          height="0.5rem"
          animated
          label="Overdue tasks"
        />
      </StyledMetricCard>

      <StyledMetricCard>
        <MetricLabel>Team Utilization</MetricLabel>
        <MetricValue>{projectMetrics.teamUtilization}</MetricValue>
        <ProgressBar
          value={projectMetrics.teamUtilization}
          color="var(--color-secondary)"
          height="0.5rem"
          animated
          label="Team members assigned to projects"
        />
      </StyledMetricCard>
    </StyledMetricsContainer>
  );
};

export default React.memo(DashboardMetrics);
export type { DashboardMetricsProps, MetricsData, TaskMetrics, ProjectMetrics };