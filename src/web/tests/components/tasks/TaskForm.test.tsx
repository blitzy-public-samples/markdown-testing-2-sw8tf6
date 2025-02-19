import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import TaskForm from '../../../../src/components/tasks/TaskForm';
import { ITask, ITaskCreateDTO, TaskPriority, TaskStatus } from '../../../../src/interfaces/task.interface';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock ResizeObserver for responsive testing
const mockResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.ResizeObserver = mockResizeObserver;

// Mock task data
const mockTask: ITask = {
  id: '123',
  title: 'Test Task',
  description: 'Test Description',
  project: {
    id: 'proj-123',
    name: 'Test Project',
  } as any,
  assignee: {
    id: 'user-123',
    name: 'Test User',
  } as any,
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  dueDate: new Date(),
  attachments: [],
  tags: [],
  dependencies: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  lastModifiedBy: 'user-123',
};

// Mock handlers
const mockHandlers = {
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
};

describe('TaskForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandlers.onSubmit.mockReset();
    mockHandlers.onCancel.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TaskForm onSubmit={mockHandlers.onSubmit} onCancel={mockHandlers.onCancel} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels and roles', () => {
      render(<TaskForm onSubmit={mockHandlers.onSubmit} onCancel={mockHandlers.onCancel} />);
      
      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText(/task title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/task description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<TaskForm onSubmit={mockHandlers.onSubmit} onCancel={mockHandlers.onCancel} />);
      
      const form = screen.getByRole('form');
      const firstInput = screen.getByLabelText(/task title/i);
      
      firstInput.focus();
      expect(document.activeElement).toBe(firstInput);
      
      await userEvent.tab();
      expect(document.activeElement).toBe(screen.getByLabelText(/task description/i));
    });
  });

  describe('Responsiveness', () => {
    it('should render correctly on mobile viewport', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));
      
      render(<TaskForm onSubmit={mockHandlers.onSubmit} onCancel={mockHandlers.onCancel} />);
      
      expect(screen.getByRole('form')).toHaveClass('task-form');
    });

    it('should render correctly on tablet viewport', () => {
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));
      
      render(<TaskForm onSubmit={mockHandlers.onSubmit} onCancel={mockHandlers.onCancel} />);
      
      expect(screen.getByRole('form')).toHaveClass('task-form');
    });

    it('should render correctly on desktop viewport', () => {
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
      
      render(<TaskForm onSubmit={mockHandlers.onSubmit} onCancel={mockHandlers.onCancel} />);
      
      expect(screen.getByRole('form')).toHaveClass('task-form');
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for required fields', async () => {
      render(<TaskForm onSubmit={mockHandlers.onSubmit} onCancel={mockHandlers.onCancel} />);
      
      await userEvent.click(screen.getByRole('button', { name: /create task/i }));
      
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/priority is required/i)).toBeInTheDocument();
      expect(screen.getByText(/due date is required/i)).toBeInTheDocument();
    });

    it('should validate title length', async () => {
      render(<TaskForm onSubmit={mockHandlers.onSubmit} onCancel={mockHandlers.onCancel} />);
      
      const titleInput = screen.getByLabelText(/task title/i);
      await userEvent.type(titleInput, 'a');
      
      await userEvent.click(screen.getByRole('button', { name: /create task/i }));
      
      expect(screen.getByText(/title must be at least 3 characters/i)).toBeInTheDocument();
    });

    it('should validate description length', async () => {
      render(<TaskForm onSubmit={mockHandlers.onSubmit} onCancel={mockHandlers.onCancel} />);
      
      const descInput = screen.getByLabelText(/task description/i);
      const longText = 'a'.repeat(2001);
      await userEvent.type(descInput, longText);
      
      await userEvent.click(screen.getByRole('button', { name: /create task/i }));
      
      expect(screen.getByText(/description must not exceed 2000 characters/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with valid form data', async () => {
      render(<TaskForm onSubmit={mockHandlers.onSubmit} onCancel={mockHandlers.onCancel} />);
      
      await userEvent.type(screen.getByLabelText(/task title/i), 'Test Task');
      await userEvent.type(screen.getByLabelText(/task description/i), 'Test Description');
      await userEvent.selectOptions(screen.getByLabelText(/priority/i), TaskPriority.HIGH);
      
      const dueDateInput = screen.getByLabelText(/due date/i);
      await userEvent.type(dueDateInput, '2024-12-31');
      
      await userEvent.click(screen.getByRole('button', { name: /create task/i }));
      
      expect(mockHandlers.onSubmit).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Task',
          description: 'Test Description',
          priority: TaskPriority.HIGH,
        })
      );
    });

    it('should show loading state during submission', async () => {
      render(<TaskForm onSubmit={mockHandlers.onSubmit} onCancel={mockHandlers.onCancel} />);
      
      // Fill form with valid data
      await userEvent.type(screen.getByLabelText(/task title/i), 'Test Task');
      mockHandlers.onSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      await userEvent.click(screen.getByRole('button', { name: /create task/i }));
      
      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    });

    it('should handle submission errors', async () => {
      mockHandlers.onSubmit.mockRejectedValue(new Error('Submission failed'));
      
      render(<TaskForm onSubmit={mockHandlers.onSubmit} onCancel={mockHandlers.onCancel} />);
      
      await userEvent.type(screen.getByLabelText(/task title/i), 'Test Task');
      await userEvent.click(screen.getByRole('button', { name: /create task/i }));
      
      expect(await screen.findByText(/failed to save task/i)).toBeInTheDocument();
    });
  });

  describe('File Attachments', () => {
    it('should handle file uploads', async () => {
      render(<TaskForm onSubmit={mockHandlers.onSubmit} onCancel={mockHandlers.onCancel} />);
      
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText(/upload files/i);
      
      await userEvent.upload(fileInput, file);
      
      expect(fileInput.files?.[0]).toBe(file);
      expect(screen.getByText(/test.pdf/i)).toBeInTheDocument();
    });

    it('should validate file types', async () => {
      render(<TaskForm onSubmit={mockHandlers.onSubmit} onCancel={mockHandlers.onCancel} />);
      
      const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      const fileInput = screen.getByLabelText(/upload files/i);
      
      await userEvent.upload(fileInput, file);
      
      expect(screen.getByText(/file type not allowed/i)).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should populate form with existing task data', () => {
      render(
        <TaskForm
          task={mockTask}
          onSubmit={mockHandlers.onSubmit}
          onCancel={mockHandlers.onCancel}
        />
      );
      
      expect(screen.getByLabelText(/task title/i)).toHaveValue(mockTask.title);
      expect(screen.getByLabelText(/task description/i)).toHaveValue(mockTask.description);
      expect(screen.getByLabelText(/priority/i)).toHaveValue(mockTask.priority);
    });

    it('should update task data on submit', async () => {
      render(
        <TaskForm
          task={mockTask}
          onSubmit={mockHandlers.onSubmit}
          onCancel={mockHandlers.onCancel}
        />
      );
      
      await userEvent.clear(screen.getByLabelText(/task title/i));
      await userEvent.type(screen.getByLabelText(/task title/i), 'Updated Task');
      
      await userEvent.click(screen.getByRole('button', { name: /update task/i }));
      
      expect(mockHandlers.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated Task',
        })
      );
    });
  });
});