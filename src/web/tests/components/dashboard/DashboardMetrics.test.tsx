import React from 'react';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { axe, toHaveNoViolations } from 'jest-axe';
import DashboardMetrics from '../../../../src/components/dashboard/DashboardMetrics';
import { ITask, TaskStatus, TaskPriority } from '../../../../src/interfaces/task.interface';
import { IProject, ProjectStatus } from '../../../../src/interfaces/project.interface';
import { UserRole } from '../../../../src/interfaces/user.interface';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

// Mock data generation utilities
const generateMockTasks = (count: number, options: Partial<ITask> = {}): ITask[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `task-${index}`,
    title: `Task ${index}`,
    description: `Description for task ${index}`,
    status: options.status || 
      [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED][Math.floor(Math.random() * 3)],
    priority: options.priority || 
      [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH][Math.floor(Math.random() * 3)],
    dueDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
    assignee: {
      id: `user-${index}`,
      name: `User ${index}`,
      email: `user${index}@example.com`,
      role: UserRole.USER,
      isEmailVerified: true,
      isMFAEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    project: {
      id: `project-${index}`,
      name: `Project ${index}`,
      description: `Project description ${index}`,
      status: ProjectStatus.ACTIVE,
      progress: Math.random() * 100,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      members: [],
      owner: null as any,
      priority: 'medium',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    attachments: [],
    tags: [],
    dependencies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastModifiedBy: `user-${index}`,
    ...options
  }));
};

const generateMockProjects = (count: number, options: Partial<IProject> = {}): IProject[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `project-${index}`,
    name: `Project ${index}`,
    description: `Project description ${index}`,
    status: options.status || ProjectStatus.ACTIVE,
    progress: options.progress || Math.random() * 100,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    owner: {
      id: `user-${index}`,
      name: `User ${index}`,
      email: `user${index}@example.com`,
      role: UserRole.MANAGER,
      isEmailVerified: true,
      isMFAEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    members: Array.from({ length: 3 }, (_, i) => ({
      id: `member-${i}`,
      name: `Team Member ${i}`,
      email: `member${i}@example.com`,
      role: UserRole.USER,
      isEmailVerified: true,
      isMFAEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })),
    priority: 'medium',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...options
  }));
};

describe('DashboardMetrics Component', () => {
  // Test rendering and calculations
  describe('Rendering and Calculations', () => {
    it('renders all metric cards with correct initial values', () => {
      const tasks = generateMockTasks(10);
      const projects = generateMockProjects(5);
      
      render(<DashboardMetrics tasks={tasks} projects={projects} />);
      
      expect(screen.getByText('Task Completion Rate')).toBeInTheDocument();
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
      expect(screen.getByText('Project Progress')).toBeInTheDocument();
      expect(screen.getByText('Tasks Due Soon')).toBeInTheDocument();
      expect(screen.getByText('Overdue Tasks')).toBeInTheDocument();
      expect(screen.getByText('Team Utilization')).toBeInTheDocument();
    });

    it('calculates task completion rate correctly', () => {
      const tasks = generateMockTasks(10, { 
        status: TaskStatus.COMPLETED 
      }).concat(generateMockTasks(10, { 
        status: TaskStatus.IN_PROGRESS 
      }));
      
      render(<DashboardMetrics tasks={tasks} projects={[]} />);
      
      const completionRate = screen.getByText(/50.0%/);
      expect(completionRate).toBeInTheDocument();
    });

    it('calculates project metrics accurately', () => {
      const projects = generateMockProjects(4, { 
        progress: 75 
      });
      
      render(<DashboardMetrics tasks={[]} projects={projects} />);
      
      const progressElement = screen.getByText(/75.0%/);
      expect(progressElement).toBeInTheDocument();
    });
  });

  // Test real-time updates
  describe('Real-time Updates', () => {
    it('updates metrics when tasks change', async () => {
      const onMetricsCalculated = jest.fn();
      const initialTasks = generateMockTasks(5);
      const { rerender } = render(
        <DashboardMetrics 
          tasks={initialTasks} 
          projects={[]} 
          onMetricsCalculated={onMetricsCalculated}
        />
      );

      const updatedTasks = [
        ...initialTasks,
        ...generateMockTasks(2, { status: TaskStatus.COMPLETED })
      ];

      rerender(
        <DashboardMetrics 
          tasks={updatedTasks} 
          projects={[]} 
          onMetricsCalculated={onMetricsCalculated}
        />
      );

      await waitFor(() => {
        expect(onMetricsCalculated).toHaveBeenCalledTimes(2);
      });
    });

    it('refreshes metrics at specified interval', async () => {
      jest.useFakeTimers();
      const onMetricsCalculated = jest.fn();
      
      render(
        <DashboardMetrics 
          tasks={generateMockTasks(5)} 
          projects={generateMockProjects(3)}
          refreshInterval={5000}
          onMetricsCalculated={onMetricsCalculated}
        />
      );

      jest.advanceTimersByTime(15000);
      
      expect(onMetricsCalculated).toHaveBeenCalledTimes(4); // Initial + 3 refreshes
      
      jest.useRealTimers();
    });
  });

  // Test accessibility
  describe('Accessibility', () => {
    it('meets WCAG accessibility standards', async () => {
      const { container } = render(
        <DashboardMetrics 
          tasks={generateMockTasks(5)} 
          projects={generateMockProjects(3)} 
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides appropriate ARIA labels for progress bars', () => {
      render(
        <DashboardMetrics 
          tasks={generateMockTasks(5)} 
          projects={generateMockProjects(3)} 
        />
      );

      const progressBars = screen.getAllByRole('progressbar');
      progressBars.forEach(bar => {
        expect(bar).toHaveAttribute('aria-valuemin', '0');
        expect(bar).toHaveAttribute('aria-valuemax', '100');
        expect(bar).toHaveAttribute('aria-valuenow');
        expect(bar).toHaveAttribute('aria-label');
      });
    });
  });

  // Test performance
  describe('Performance', () => {
    it('memoizes calculations to prevent unnecessary rerenders', () => {
      const tasks = generateMockTasks(100);
      const projects = generateMockProjects(20);
      
      const { rerender } = render(
        <DashboardMetrics tasks={tasks} projects={projects} />
      );

      const startTime = performance.now();
      rerender(<DashboardMetrics tasks={tasks} projects={projects} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(16); // Under 1 frame (16.67ms)
    });

    it('handles large datasets efficiently', () => {
      const tasks = generateMockTasks(1000);
      const projects = generateMockProjects(100);
      
      const startTime = performance.now();
      render(<DashboardMetrics tasks={tasks} projects={projects} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(300); // Under 300ms render time
    });
  });

  // Test error handling
  describe('Error Handling', () => {
    it('handles missing or invalid task data gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<DashboardMetrics tasks={null as any} projects={[]} />);
      
      expect(screen.getByText('Task Completion Rate')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('handles missing or invalid project data gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<DashboardMetrics tasks={[]} projects={null as any} />);
      
      expect(screen.getByText('Project Progress')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });
});