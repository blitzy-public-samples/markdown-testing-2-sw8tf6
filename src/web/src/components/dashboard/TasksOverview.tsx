import React, { useMemo, useCallback } from 'react'; // ^18.0.0
import { useSelector } from 'react-redux'; // ^8.1.0
import styled from 'styled-components'; // ^6.0.0
import { ITask, TaskStatus, TaskPriority } from '../../interfaces/task.interface';
import ProgressBar from '../common/ProgressBar';
import { selectTasks, selectTasksByStatus } from '../../store/task/task.selectors';

// Styled components with responsive design
const StyledOverviewContainer = styled.div`
  padding: 1.5rem;
  background-color: var(--background-secondary);
  border-radius: var(--border-radius-large);
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
  position: relative;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const StyledTaskMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const MetricCard = styled.div`
  padding: 1rem;
  background-color: var(--background-primary);
  border-radius: var(--border-radius-medium);
  box-shadow: var(--shadow-xs);
`;

const PrioritySection = styled.div`
  margin-top: 1.5rem;
`;

const PriorityHeader = styled.h3`
  font-size: 1.1rem;
  color: var(--text-primary);
  margin-bottom: 1rem;
`;

const TaskList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const TaskItem = styled.li<{ $priority: TaskPriority }>`
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background-color: var(--background-primary);
  border-left: 4px solid ${({ $priority }) => 
    $priority === TaskPriority.HIGH ? 'var(--error-color)' :
    $priority === TaskPriority.MEDIUM ? 'var(--warning-color)' :
    'var(--success-color)'};
  border-radius: var(--border-radius-small);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

// Memoized helper functions
const calculateTaskProgress = (tasks: ITask[]): number => {
  if (!tasks?.length) return 0;
  
  const completedTasks = tasks.filter(
    task => task.status === TaskStatus.COMPLETED
  ).length;
  
  return Math.round((completedTasks / tasks.length) * 100);
};

const getTasksByPriority = (tasks: ITask[]): Record<TaskPriority, ITask[]> => {
  const priorityGroups: Record<TaskPriority, ITask[]> = {
    [TaskPriority.HIGH]: [],
    [TaskPriority.MEDIUM]: [],
    [TaskPriority.LOW]: []
  };

  if (!tasks?.length) return priorityGroups;

  return tasks.reduce((acc, task) => {
    if (task.priority in acc) {
      acc[task.priority].push(task);
    }
    return acc;
  }, priorityGroups);
};

const TasksOverview: React.FC = () => {
  // Redux selectors
  const allTasks = useSelector(selectTasks);
  const inProgressTasks = useSelector(selectTasksByStatus(TaskStatus.IN_PROGRESS));
  
  // Memoized calculations
  const taskProgress = useMemo(() => 
    calculateTaskProgress(allTasks),
    [allTasks]
  );

  const tasksByPriority = useMemo(() => 
    getTasksByPriority(allTasks),
    [allTasks]
  );

  // Memoized metrics
  const metrics = useMemo(() => [
    {
      label: 'Total Tasks',
      value: allTasks.length,
      ariaLabel: `Total of ${allTasks.length} tasks`
    },
    {
      label: 'In Progress',
      value: inProgressTasks.length,
      ariaLabel: `${inProgressTasks.length} tasks in progress`
    },
    {
      label: 'Completion Rate',
      value: `${taskProgress}%`,
      ariaLabel: `${taskProgress}% of tasks completed`
    }
  ], [allTasks.length, inProgressTasks.length, taskProgress]);

  // Render priority section
  const renderPrioritySection = useCallback((priority: TaskPriority) => {
    const tasks = tasksByPriority[priority];
    if (!tasks.length) return null;

    return (
      <PrioritySection key={priority}>
        <PriorityHeader>
          {priority.charAt(0) + priority.slice(1).toLowerCase()} Priority Tasks
        </PriorityHeader>
        <TaskList>
          {tasks.map(task => (
            <TaskItem
              key={task.id}
              $priority={priority}
              aria-label={`${task.title} - ${priority.toLowerCase()} priority task`}
            >
              <span>{task.title}</span>
              <span>{TaskStatus[task.status]}</span>
            </TaskItem>
          ))}
        </TaskList>
      </PrioritySection>
    );
  }, [tasksByPriority]);

  return (
    <StyledOverviewContainer role="region" aria-label="Tasks Overview">
      <StyledTaskMetrics>
        {metrics.map(({ label, value, ariaLabel }) => (
          <MetricCard key={label} aria-label={ariaLabel}>
            <h4>{label}</h4>
            <strong>{value}</strong>
          </MetricCard>
        ))}
      </StyledTaskMetrics>

      <ProgressBar
        value={taskProgress}
        color="var(--primary-color)"
        height="0.75rem"
        animated
        label="Overall task completion progress"
      />

      {Object.values(TaskPriority).map(priority => 
        renderPrioritySection(priority)
      )}
    </StyledOverviewContainer>
  );
};

// Display name for debugging
TasksOverview.displayName = 'TasksOverview';

export default TasksOverview;