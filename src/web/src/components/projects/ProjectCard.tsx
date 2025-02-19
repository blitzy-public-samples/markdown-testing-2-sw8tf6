import React, { useMemo, useCallback } from 'react';
import classNames from 'classnames'; // ^2.3.0
import { Card } from '../common/Card';
import ProgressBar from '../common/ProgressBar';
import { IProject, ProjectStatus } from '../../interfaces/project.interface';
import styles from './ProjectCard.module.css';

export interface ProjectCardProps {
  project: IProject;
  onClick?: (project: IProject) => void;
  className?: string;
  variant?: 'default' | 'elevated';
  isCompact?: boolean;
}

export const ProjectCard: React.FC<ProjectCardProps> = React.memo(({
  project,
  onClick,
  className,
  variant = 'default',
  isCompact = false
}) => {
  // Calculate project progress based on completed tasks
  const progress = useMemo(() => {
    return Math.min(Math.max(project.progress, 0), 100);
  }, [project.progress]);

  // Format date for display
  const formatDate = useCallback((date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  // Handle keyboard interactions for accessibility
  const handleKeyPress = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick(project);
    }
  }, [onClick, project]);

  // Get status indicator color
  const getStatusColor = useCallback((status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.ACTIVE:
        return 'var(--color-success)';
      case ProjectStatus.BLOCKED:
        return 'var(--color-error)';
      case ProjectStatus.COMPLETED:
        return 'var(--color-info)';
      case ProjectStatus.ARCHIVED:
        return 'var(--color-muted)';
      default:
        return 'var(--color-warning)';
    }
  }, []);

  const cardClasses = useMemo(() => 
    classNames(
      styles.projectCard,
      {
        [styles.compact]: isCompact,
        [styles.interactive]: !!onClick
      },
      className
    ),
    [isCompact, onClick, className]
  );

  return (
    <Card
      variant={variant}
      className={cardClasses}
      onClick={onClick ? () => onClick(project) : undefined}
      isInteractive={!!onClick}
      ariaLabel={`Project: ${project.name}`}
      ariaDescribedBy={`project-description-${project.id}`}
      testId={`project-card-${project.id}`}
    >
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>{project.name}</h3>
          <span 
            className={styles.status}
            style={{ backgroundColor: getStatusColor(project.status) }}
          >
            {project.status}
          </span>
        </div>
        <div className={styles.priority}>
          Priority: {project.priority}
        </div>
      </div>

      <p 
        id={`project-description-${project.id}`}
        className={styles.description}
      >
        {project.description}
      </p>

      <div className={styles.progress}>
        <ProgressBar
          value={progress}
          label={`Project progress: ${progress}%`}
          color={getStatusColor(project.status)}
          height="0.5rem"
          animated
        />
      </div>

      <div className={styles.metadata}>
        <div className={styles.dates}>
          <span>Start: {formatDate(project.startDate)}</span>
          <span>Due: {formatDate(project.endDate)}</span>
        </div>
        
        <div className={styles.members}>
          {project.members.slice(0, 3).map((member, index) => (
            <img
              key={member.id}
              src={member.avatar || '/default-avatar.png'}
              alt={member.name}
              className={styles.avatar}
              style={{ zIndex: 3 - index }}
              title={member.name}
            />
          ))}
          {project.members.length > 3 && (
            <span className={styles.memberCount}>
              +{project.members.length - 3}
            </span>
          )}
        </div>
      </div>

      {project.tags.length > 0 && (
        <div className={styles.tags}>
          {project.tags.map(tag => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
});

ProjectCard.displayName = 'ProjectCard';

// CSS Module
const styles = {
  projectCard: `
    container-type: inline-size;
    min-width: 300px;
    max-width: var(--max-width-lg);
  `,
  header: `
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  `,
  titleSection: `
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  `,
  title: `
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
  `,
  status: `
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius-full);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-white);
  `,
  priority: `
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  `,
  description: `
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-md);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `,
  progress: `
    margin-bottom: var(--spacing-md);
  `,
  metadata: `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  `,
  dates: `
    display: flex;
    gap: var(--spacing-md);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  `,
  members: `
    display: flex;
    align-items: center;
  `,
  avatar: `
    width: 32px;
    height: 32px;
    border-radius: var(--border-radius-full);
    border: 2px solid var(--color-background);
    margin-left: -8px;
    &:first-child {
      margin-left: 0;
    }
  `,
  memberCount: `
    background: var(--color-background-secondary);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius-full);
    margin-left: var(--spacing-xs);
  `,
  tags: `
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  `,
  tag: `
    background: var(--color-background-secondary);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius-full);
  `,
  compact: `
    @container (max-width: 400px) {
      .description {
        -webkit-line-clamp: 1;
      }
      .metadata {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-sm);
      }
      .tags {
        display: none;
      }
    }
  `,
  interactive: `
    cursor: pointer;
    transition: transform var(--transition-fast);
    &:hover {
      transform: translateY(-2px);
    }
  `
} as const;