import React, { useMemo } from 'react';
import styled from 'styled-components';
import { IProject, ProjectStatus } from '../../interfaces/project.interface';
import Card from '../common/Card';
import ProgressBar from '../common/ProgressBar';

// Props interface for the component
interface ProjectMetricsProps {
  project: IProject;
  className?: string;
}

// Styled components for layout and metrics display
const MetricsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  margin: 0 auto;
  max-width: 1200px;
  width: 100%;
`;

const MetricCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  transition: transform var(--transition-fast);

  &:hover {
    transform: translateY(-2px);
  }
`;

const MetricTitle = styled.h3`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetricValue = styled.div`
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  line-height: 1.2;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
`;

// Utility functions with memoization
const calculateTimelineProgress = (startDate: Date, endDate: Date): number => {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();

  if (now <= start) return 0;
  if (now >= end) return 100;

  const totalDuration = end - start;
  const elapsed = now - start;
  const progress = (elapsed / totalDuration) * 100;

  return Math.round(Math.min(Math.max(progress, 0), 100));
};

const calculateMemberEngagement = (members: IProject['members']): number => {
  if (!members?.length) return 0;
  
  const activeMembers = members.filter(member => {
    const lastActive = new Date(member.lastLoginAt || 0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return lastActive > sevenDaysAgo;
  });

  return Math.round((activeMembers.length / members.length) * 100);
};

// Main component with performance optimization
export const ProjectMetrics: React.FC<ProjectMetricsProps> = React.memo(({ project, className }) => {
  // Memoized calculations
  const timelineProgress = useMemo(() => 
    calculateTimelineProgress(project.startDate, project.endDate),
    [project.startDate, project.endDate]
  );

  const memberEngagement = useMemo(() => 
    calculateMemberEngagement(project.members),
    [project.members]
  );

  const statusColor = useMemo(() => {
    const colors = {
      [ProjectStatus.ACTIVE]: '#4CAF50',
      [ProjectStatus.BLOCKED]: '#F44336',
      [ProjectStatus.COMPLETED]: '#2196F3',
      [ProjectStatus.DRAFT]: '#9E9E9E',
      [ProjectStatus.ARCHIVED]: '#757575'
    };
    return colors[project.status] || colors[ProjectStatus.DRAFT];
  }, [project.status]);

  return (
    <MetricsContainer className={className} role="region" aria-label="Project Metrics">
      <MetricCard variant="elevated" padding="md">
        <MetricTitle>Progress</MetricTitle>
        <MetricValue>
          {project.progress}%
          <ProgressBar 
            value={project.progress} 
            color={statusColor}
            height="0.5rem"
            label="Project progress"
          />
        </MetricValue>
      </MetricCard>

      <MetricCard variant="elevated" padding="md">
        <MetricTitle>Timeline</MetricTitle>
        <MetricValue>
          {timelineProgress}%
          <ProgressBar 
            value={timelineProgress}
            color="#2196F3"
            height="0.5rem"
            label="Timeline progress"
          />
        </MetricValue>
      </MetricCard>

      <MetricCard variant="elevated" padding="md">
        <MetricTitle>Team Engagement</MetricTitle>
        <MetricValue>
          {memberEngagement}%
          <ProgressBar 
            value={memberEngagement}
            color="#4CAF50"
            height="0.5rem"
            label="Team engagement"
          />
        </MetricValue>
      </MetricCard>

      <MetricCard variant="elevated" padding="md">
        <MetricTitle>Team Size</MetricTitle>
        <MetricValue>
          {project.members.length} Members
        </MetricValue>
      </MetricCard>
    </MetricsContainer>
  );
});

// Display name for debugging
ProjectMetrics.displayName = 'ProjectMetrics';

export default ProjectMetrics;