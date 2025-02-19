import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import WS from 'jest-websocket-mock';
import Dashboard from '../../src/pages/dashboard/Dashboard';
import rootReducer from '../../src/store/rootReducer';
import { TaskStatus, TaskPriority } from '../../src/interfaces/task.interface';
import { ProjectStatus } from '../../src/interfaces/project.interface';

// Mock dependencies
jest.mock('../../src/hooks/useAuth', () => ({
  __esModule: true,
  default: () => ({
    user: { id: '1', name: 'Test User', role: 'USER' },
    isAuthenticated: true,
    isMFAVerified: true,
    isEmailVerified: true
  })
}));

jest.mock('../../src/hooks/useWebSocket', () => ({
  __esModule: true,
  default: () => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: true
  })
}));

// Mock data
const mockTasks = [
  {
    id: '1',
    title: 'Test Task 1',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    dueDate: new Date().toISOString(),
    assignee: { id: '1', name: 'Test User' }
  }
];

const mockProjects = [
  {
    id: '1',
    name: 'Test Project',
    status: ProjectStatus.ACTIVE,
    progress: 75,
    startDate: new Date(Date.now() - 86400000),
    endDate: new Date(Date.now() + 86400000),
    members: [{ id: '1', name: 'Test User' }]
  }
];

// Helper function to render with providers
const renderWithProviders = (
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = configureStore({ reducer: rootReducer, preloadedState }),
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  );

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  };
};

// WebSocket mock setup
const setupMockWebSocket = () => {
  const ws = new WS('ws://localhost:1234');
  return ws;
};

describe('Dashboard Component', () => {
  let mockWebSocket: WS;

  beforeEach(() => {
    mockWebSocket = setupMockWebSocket();
  });

  afterEach(() => {
    WS.clean();
  });

  it('renders dashboard with metrics when authenticated', async () => {
    const { store } = renderWithProviders(<Dashboard />, {
      preloadedState: {
        tasks: { tasks: mockTasks, loading: false },
        projects: { projects: mockProjects, loading: false }
      }
    });

    // Verify metrics section is rendered
    const metricsSection = screen.getByRole('region', { name: /performance metrics/i });
    expect(metricsSection).toBeInTheDocument();

    // Verify task metrics
    const taskMetrics = within(metricsSection).getByText(/task completion rate/i);
    expect(taskMetrics).toBeInTheDocument();

    // Verify project metrics
    const projectMetrics = within(metricsSection).getByText(/active projects/i);
    expect(projectMetrics).toBeInTheDocument();

    // Verify tasks overview section
    const tasksOverview = screen.getByRole('region', { name: /tasks overview/i });
    expect(tasksOverview).toBeInTheDocument();
  });

  it('handles real-time updates via WebSocket', async () => {
    const { store } = renderWithProviders(<Dashboard />, {
      preloadedState: {
        tasks: { tasks: mockTasks, loading: false },
        projects: { projects: mockProjects, loading: false }
      }
    });

    // Simulate WebSocket connection
    await mockWebSocket.connected;

    // Simulate real-time task update
    const updatedTask = {
      ...mockTasks[0],
      status: TaskStatus.COMPLETED
    };

    mockWebSocket.send(JSON.stringify({
      type: 'TASK_UPDATED',
      payload: updatedTask
    }));

    // Verify metrics are updated
    await waitFor(() => {
      const completionRate = screen.getByText(/100%/);
      expect(completionRate).toBeInTheDocument();
    });

    // Verify last update timestamp
    const lastUpdate = screen.getByText(/last updated/i);
    expect(lastUpdate).toBeInTheDocument();
  });

  it('adapts layout for different screen sizes', async () => {
    // Mock mobile viewport
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));

    const { store } = renderWithProviders(<Dashboard />);

    // Verify mobile layout
    const dashboard = screen.getByRole('main');
    expect(dashboard).toHaveStyle({ padding: 'var(--spacing-md)' });

    // Mock desktop viewport
    global.innerWidth = 1024;
    global.dispatchEvent(new Event('resize'));

    // Verify desktop layout
    await waitFor(() => {
      expect(dashboard).toHaveStyle({ padding: 'var(--spacing-lg)' });
    });
  });

  it('handles error states gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { store } = renderWithProviders(<Dashboard />, {
      preloadedState: {
        tasks: { tasks: [], loading: false, error: 'Failed to load tasks' },
        projects: { projects: [], loading: false }
      }
    });

    // Verify error message is displayed
    const errorMessage = screen.getByRole('alert');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveTextContent(/failed to load tasks/i);

    consoleErrorSpy.mockRestore();
  });

  it('shows loading states during data fetching', async () => {
    const { store } = renderWithProviders(<Dashboard />, {
      preloadedState: {
        tasks: { tasks: [], loading: true },
        projects: { projects: [], loading: true }
      }
    });

    // Verify loading indicators
    const loadingElements = screen.getAllByRole('progressbar');
    expect(loadingElements.length).toBeGreaterThan(0);

    // Update store to loaded state
    store.dispatch({ type: 'tasks/setLoading', payload: false });
    store.dispatch({ type: 'projects/setLoading', payload: false });

    // Verify loading indicators are removed
    await waitFor(() => {
      const loadingElements = screen.queryAllByRole('progressbar', { name: /loading/i });
      expect(loadingElements.length).toBe(0);
    });
  });

  it('maintains WebSocket connection lifecycle', async () => {
    const { unmount } = renderWithProviders(<Dashboard />);

    // Verify WebSocket connection is established
    await mockWebSocket.connected;
    expect(mockWebSocket.readyState).toBe(WebSocket.OPEN);

    // Unmount component
    unmount();

    // Verify WebSocket connection is closed
    await waitFor(() => {
      expect(mockWebSocket.readyState).toBe(WebSocket.CLOSED);
    });
  });
});