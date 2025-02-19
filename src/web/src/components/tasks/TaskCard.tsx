import React, { useMemo } from 'react';
import classnames from 'classnames';
import { Card, CardProps } from '../common/Card';
import { ITask, TaskStatus, TaskPriority } from '../../interfaces/task.interface';
import { getRelativeDueDate, getDueDateStatus } from '../../utils/date.util';
import styles from './TaskCard.module.css';

// Props interface for the TaskCard component
export interface TaskCardProps {
  task: ITask;
  onClick?: (task: ITask) => void;
  className?: string;
  isSelected?: boolean;
}

// Helper function to get status color class
const getStatusColor = (status: TaskStatus): string => {
  const statusColorMap: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: styles.statusTodo,
    [TaskStatus.IN_PROGRESS]: styles.statusInProgress,
    [TaskStatus.IN_REVIEW]: styles.statusInReview,
    [TaskStatus.COMPLETED]: styles.statusCompleted,
    [TaskStatus.BLOCKED]: styles.statusBlocked
  };
  return statusColorMap[status] || styles.statusTodo;
};

// Helper function to get priority icon class
const getPriorityIcon = (priority: TaskPriority): string => {
  const priorityIconMap: Record<TaskPriority, string> = {
    [TaskPriority.HIGH]: styles.priorityHigh,
    [TaskPriority.MEDIUM]: styles.priorityMedium,
    [TaskPriority.LOW]: styles.priorityLow
  };
  return priorityIconMap[priority] || styles.priorityMedium;
};

export const TaskCard: React.FC<TaskCardProps> = React.memo(({
  task,
  onClick,
  className,
  isSelected = false
}) => {
  // Memoized card classes
  const cardClasses = useMemo(() => 
    classnames(
      styles.taskCard,
      {
        [styles.selected]: isSelected,
        [styles.interactive]: !!onClick
      },
      className
    ),
    [isSelected, onClick, className]
  );

  // Memoized due date status
  const dueDateStatus = useMemo(() => 
    getDueDateStatus(task.dueDate),
    [task.dueDate]
  );

  // Handle card click
  const handleClick = React.useCallback(() => {
    onClick?.(task);
  }, [onClick, task]);

  return (
    <Card
      variant="default"
      padding="md"
      className={cardClasses}
      onClick={handleClick}
      isInteractive={!!onClick}
      ariaLabel={`Task: ${task.title}`}
      ariaDescribedBy={`task-${task.id}-status`}
      testId={`task-card-${task.id}`}
    >
      <div className={styles.header}>
        <div className={styles.title} title={task.title}>
          {task.title}
        </div>
        <div className={styles.badges}>
          <span 
            className={classnames(styles.status, getStatusColor(task.status))}
            id={`task-${task.id}-status`}
            role="status"
            aria-label={`Status: ${task.status.toLowerCase().replace('_', ' ')}`}
          >
            {task.status.replace('_', ' ')}
          </span>
          <span 
            className={classnames(styles.priority, getPriorityIcon(task.priority))}
            role="img"
            aria-label={`Priority: ${task.priority.toLowerCase()}`}
          />
        </div>
      </div>

      <div className={styles.content}>
        {task.description && (
          <p className={styles.description} title={task.description}>
            {task.description}
          </p>
        )}
        
        <div className={styles.metadata}>
          {task.assignee && (
            <div className={styles.assignee}>
              {task.assignee.avatar ? (
                <img 
                  src={task.assignee.avatar}
                  alt={task.assignee.name}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {task.assignee.name.charAt(0)}
                </div>
              )}
              <span className={styles.assigneeName}>{task.assignee.name}</span>
            </div>
          )}
          
          <div 
            className={classnames(styles.dueDate, styles[dueDateStatus])}
            role="status"
            aria-label={`Due date: ${getRelativeDueDate(task.dueDate)}`}
          >
            {getRelativeDueDate(task.dueDate)}
          </div>
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className={styles.tags} aria-label="Task tags">
            {task.tags.map(tag => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
});

TaskCard.displayName = 'TaskCard';

// CSS Module
const styles = {
  taskCard: `
    width: 100%;
    transition: transform var(--transition-fast);
    border: var(--border-width-thin) solid var(--color-border);
    background: var(--color-background);
  `,
  selected: `
    border-color: var(--color-primary);
    box-shadow: var(--shadow-md);
  `,
  interactive: `
    cursor: pointer;
    &:hover {
      transform: translateY(-2px);
    }
  `,
  header: `
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--spacing-sm);
  `,
  title: `
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  badges: `
    display: flex;
    gap: var(--spacing-xs);
    align-items: center;
  `,
  status: `
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
  `,
  statusTodo: `
    background: var(--color-gray-100);
    color: var(--color-gray-700);
  `,
  statusInProgress: `
    background: var(--color-blue-100);
    color: var(--color-blue-700);
  `,
  statusInReview: `
    background: var(--color-purple-100);
    color: var(--color-purple-700);
  `,
  statusCompleted: `
    background: var(--color-green-100);
    color: var(--color-green-700);
  `,
  statusBlocked: `
    background: var(--color-red-100);
    color: var(--color-red-700);
  `,
  priority: `
    width: 16px;
    height: 16px;
    border-radius: var(--border-radius-full);
  `,
  priorityHigh: `
    background: var(--color-red-500);
  `,
  priorityMedium: `
    background: var(--color-yellow-500);
  `,
  priorityLow: `
    background: var(--color-green-500);
  `,
  content: `
    margin-top: var(--spacing-sm);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  `,
  description: `
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  `,
  metadata: `
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-sm);
  `,
  assignee: `
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  `,
  avatar: `
    width: 24px;
    height: 24px;
    border-radius: var(--border-radius-full);
    object-fit: cover;
  `,
  avatarPlaceholder: `
    width: 24px;
    height: 24px;
    border-radius: var(--border-radius-full);
    background: var(--color-gray-200);
    color: var(--color-gray-600);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
  `,
  assigneeName: `
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  `,
  dueDate: `
    font-size: var(--font-size-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius-sm);
  `,
  'overdue': `
    background: var(--color-red-100);
    color: var(--color-red-700);
  `,
  'due-soon': `
    background: var(--color-yellow-100);
    color: var(--color-yellow-700);
  `,
  'on-track': `
    background: var(--color-green-100);
    color: var(--color-green-700);
  `,
  tags: `
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  `,
  tag: `
    font-size: var(--font-size-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-gray-100);
    color: var(--color-gray-700);
    border-radius: var(--border-radius-full);
  `
} as const;

export default TaskCard;