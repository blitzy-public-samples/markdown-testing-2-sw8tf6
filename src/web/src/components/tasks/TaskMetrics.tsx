import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0
import Card from '../common/Card';
import ProgressBar from '../common/ProgressBar';
import { useWebSocket } from '../../hooks/useWebSocket';

// Interfaces
interface TaskMetricsProps {
  tasks: ITask[];
  className?: string;
  refreshInterval?: number;
}

interface ITask {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  dueDate: Date;
}

interface TaskMetricsData {
  completionRate: number;
  priorityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  statusBreakdown: {
    todo: number;
    inProgress: number;
    completed: number;
    blocked: number;
  };
  overdueRate: number;
}

// Styled Components
const MetricsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  width: 100%;
  content-visibility: auto;
`;

const MetricCard = styled(Card)`
  min-height: 200px;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
`;

const MetricTitle = styled.h3`
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const MetricValue = styled.div`
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: ${({ theme }) => theme.colors.text.primary};
`;

const MetricLabel = styled.div`
  font-size: var(--font-size-sm);
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: var(--spacing-xs);
`;

// Error Fallback Component
const ErrorFallback = ({ error }: { error: Error }) => (
  <MetricCard>
    <MetricTitle>Error Loading Metrics</MetricTitle>
    <MetricValue>⚠️</MetricValue>
    <MetricLabel>{error.message}</MetricLabel>
  </MetricCard>
);

// Main Component
export const TaskMetrics: React.FC<TaskMetricsProps> = React.memo(({
  tasks,
  className,
  refreshInterval = 30000
}) => {
  const [metrics, setMetrics] = useState<TaskMetricsData | null>(null);
  const { subscribe, unsubscribe } = useWebSocket(true);

  // Calculate metrics with memoization
  const calculateMetrics = useMemo((): TaskMetricsData => {
    const total = tasks.length;
    if (total === 0) {
      return {
        completionRate: 0,
        priorityDistribution: { high: 0, medium: 0, low: 0 },
        statusBreakdown: { todo: 0, inProgress: 0, completed: 0, blocked: 0 },
        overdueRate: 0
      };
    }

    const completed = tasks.filter(task => task.status === 'COMPLETED').length;
    const now = new Date();
    const overdue = tasks.filter(task => new Date(task.dueDate) < now && task.status !== 'COMPLETED').length;

    const priorities = tasks.reduce(
      (acc, task) => {
        acc[task.priority.toLowerCase() as keyof typeof acc]++;
        return acc;
      },
      { high: 0, medium: 0, low: 0 }
    );

    const statuses = tasks.reduce(
      (acc, task) => {
        const status = task.status.toLowerCase().replace(/_/g, '') as keyof typeof acc;
        acc[status]++;
        return acc;
      },
      { todo: 0, inProgress: 0, completed: 0, blocked: 0 }
    );

    return {
      completionRate: (completed / total) * 100,
      priorityDistribution: {
        high: (priorities.high / total) * 100,
        medium: (priorities.medium / total) * 100,
        low: (priorities.low / total) * 100
      },
      statusBreakdown: {
        todo: (statuses.todo / total) * 100,
        inProgress: (statuses.inProgress / total) * 100,
        completed: (statuses.completed / total) * 100,
        blocked: (statuses.blocked / total) * 100
      },
      overdueRate: (overdue / total) * 100
    };
  }, [tasks]);

  // WebSocket update handler
  const handleTaskUpdate = useCallback((message: any) => {
    if (message.type === 'TASK_UPDATED') {
      setMetrics(calculateMetrics);
    }
  }, [calculateMetrics]);

  // Setup WebSocket subscription and periodic refresh
  useEffect(() => {
    subscribe('task:updated', handleTaskUpdate);
    
    const refreshTimer = setInterval(() => {
      setMetrics(calculateMetrics);
    }, refreshInterval);

    return () => {
      unsubscribe('task:updated', handleTaskUpdate);
      clearInterval(refreshTimer);
    };
  }, [subscribe, unsubscribe, handleTaskUpdate, calculateMetrics, refreshInterval]);

  // Initialize metrics
  useEffect(() => {
    setMetrics(calculateMetrics);
  }, [calculateMetrics]);

  if (!metrics) {
    return null;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <MetricsContainer className={className}>
        {/* Completion Rate Card */}
        <MetricCard>
          <MetricTitle>Task Completion Rate</MetricTitle>
          <ProgressBar
            value={metrics.completionRate}
            color="var(--color-success)"
            height="1rem"
          />
          <MetricValue>{metrics.completionRate.toFixed(1)}%</MetricValue>
          <MetricLabel>of tasks completed</MetricLabel>
        </MetricCard>

        {/* Priority Distribution Card */}
        <MetricCard>
          <MetricTitle>Priority Distribution</MetricTitle>
          <ProgressBar
            value={metrics.priorityDistribution.high}
            color="var(--color-error)"
            height="0.75rem"
          />
          <ProgressBar
            value={metrics.priorityDistribution.medium}
            color="var(--color-warning)"
            height="0.75rem"
          />
          <ProgressBar
            value={metrics.priorityDistribution.low}
            color="var(--color-success)"
            height="0.75rem"
          />
          <MetricLabel>High / Medium / Low Priority</MetricLabel>
        </MetricCard>

        {/* Status Breakdown Card */}
        <MetricCard>
          <MetricTitle>Status Breakdown</MetricTitle>
          <div>
            {Object.entries(metrics.statusBreakdown).map(([status, value]) => (
              <div key={status}>
                <ProgressBar
                  value={value}
                  color={`var(--color-${status === 'completed' ? 'success' : 
                                       status === 'blocked' ? 'error' : 
                                       status === 'inProgress' ? 'warning' : 
                                       'primary'})`}
                  height="0.75rem"
                />
                <MetricLabel>{status.charAt(0).toUpperCase() + status.slice(1)}</MetricLabel>
              </div>
            ))}
          </div>
        </MetricCard>

        {/* Overdue Rate Card */}
        <MetricCard>
          <MetricTitle>Overdue Tasks</MetricTitle>
          <ProgressBar
            value={metrics.overdueRate}
            color="var(--color-error)"
            height="1rem"
          />
          <MetricValue>{metrics.overdueRate.toFixed(1)}%</MetricValue>
          <MetricLabel>of tasks are overdue</MetricLabel>
        </MetricCard>
      </MetricsContainer>
    </ErrorBoundary>
  );
});

TaskMetrics.displayName = 'TaskMetrics';

export default TaskMetrics;