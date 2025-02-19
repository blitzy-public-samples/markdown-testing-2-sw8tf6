import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { ErrorBoundary } from 'react-error-boundary';
import MainLayout from '../../components/layout/MainLayout';
import DashboardMetrics, { MetricsData } from '../../components/dashboard/DashboardMetrics';
import TasksOverview from '../../components/dashboard/TasksOverview';
import useAuth from '../../hooks/useAuth';
import useWebSocket from '../../hooks/useWebSocket';
import { selectTasks } from '../../store/task/task.selectors';
import { selectAllNotifications } from '../../store/notification/notification.selectors';

// Styled components with responsive design
const StyledDashboard = styled.div`
  display: grid;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  
  @media (max-width: var(--breakpoint-md)) {
    padding: var(--spacing-md);
    gap: var(--spacing-md);
  }
`;

const StyledSection = styled.section`
  background-color: var(--color-background);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-normal);

  &:hover {
    box-shadow: var(--shadow-md);
  }

  @media (max-width: var(--breakpoint-md)) {
    padding: var(--spacing-md);
  }
`;

const ErrorFallback = styled.div`
  padding: var(--spacing-lg);
  color: var(--color-error);
  text-align: center;
  background-color: var(--color-error-light);
  border-radius: var(--border-radius-md);
  margin: var(--spacing-md);
`;

// Dashboard component with real-time updates and error handling
const Dashboard: React.FC = () => {
  const { user, isAuthenticated, isMFAVerified } = useAuth();
  const { connect, disconnect, isConnected } = useWebSocket(true);
  const tasks = useSelector(selectTasks);
  const notifications = useSelector(selectAllNotifications);
  const [lastMetricsUpdate, setLastMetricsUpdate] = useState<Date | null>(null);

  // Initialize WebSocket connection for real-time updates
  useEffect(() => {
    if (isAuthenticated && isMFAVerified) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [isAuthenticated, isMFAVerified, connect, disconnect]);

  // Handle metrics calculation callback
  const handleMetricsCalculated = useCallback((metrics: MetricsData) => {
    setLastMetricsUpdate(metrics.timestamp);
    // Additional metrics processing could be added here
  }, []);

  // Error boundary handler
  const handleError = (error: Error) => {
    console.error('Dashboard Error:', error);
    // Implement error reporting service call here
  };

  if (!isAuthenticated || !isMFAVerified) {
    return null;
  }

  return (
    <MainLayout>
      <ErrorBoundary
        FallbackComponent={({ error }) => (
          <ErrorFallback role="alert">
            <h2>Dashboard Error</h2>
            <pre>{error.message}</pre>
          </ErrorFallback>
        )}
        onError={handleError}
      >
        <StyledDashboard>
          {/* Real-time connection status indicator */}
          {!isConnected && (
            <div
              role="status"
              aria-live="polite"
              style={{
                padding: 'var(--spacing-sm)',
                backgroundColor: 'var(--color-warning-light)',
                borderRadius: 'var(--border-radius-sm)',
                textAlign: 'center'
              }}
            >
              Reconnecting to real-time updates...
            </div>
          )}

          {/* Metrics Overview Section */}
          <StyledSection aria-labelledby="metrics-heading">
            <h2 id="metrics-heading">Performance Metrics</h2>
            <DashboardMetrics
              tasks={tasks}
              projects={[]} // Projects will be added when available
              refreshInterval={30000}
              onMetricsCalculated={handleMetricsCalculated}
            />
          </StyledSection>

          {/* Tasks Overview Section */}
          <StyledSection aria-labelledby="tasks-heading">
            <h2 id="tasks-heading">Tasks Overview</h2>
            <TasksOverview />
          </StyledSection>

          {/* Metrics update timestamp */}
          {lastMetricsUpdate && (
            <div
              role="status"
              aria-live="polite"
              style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}
            >
              Last updated: {lastMetricsUpdate.toLocaleTimeString()}
            </div>
          )}
        </StyledDashboard>
      </ErrorBoundary>
    </MainLayout>
  );
};

// Display name for debugging
Dashboard.displayName = 'Dashboard';

export default Dashboard;