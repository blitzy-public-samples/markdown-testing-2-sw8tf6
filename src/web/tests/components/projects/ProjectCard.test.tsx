import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import MatchMediaMock from 'jest-matchmedia-mock';
import { ProjectCard, ProjectCardProps } from '../../src/components/projects/ProjectCard';
import { IProject, ProjectStatus } from '../../src/interfaces/project.interface';
import { UserRole } from '../../src/interfaces/user.interface';

// Initialize matchMedia mock
let matchMedia: MatchMediaMock;

// Create mock themes
const lightTheme = createTheme({ palette: { mode: 'light' } });
const darkTheme = createTheme({ palette: { mode: 'dark' } });

// Helper function to render ProjectCard with theme
const renderProjectCard = (props: ProjectCardProps, theme = lightTheme) => {
  return render(
    <ThemeProvider theme={theme}>
      <ProjectCard {...props} />
    </ThemeProvider>
  );
};

// Mock project data factory
const createMockProject = (overrides: Partial<IProject> = {}): IProject => ({
  id: 'test-project-1',
  name: 'Test Project',
  description: 'A test project description',
  status: ProjectStatus.ACTIVE,
  progress: 75,
  priority: 'high',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  owner: {
    id: 'owner-1',
    name: 'Project Owner',
    email: 'owner@test.com',
    role: UserRole.MANAGER,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  members: [
    {
      id: 'member-1',
      name: 'Team Member 1',
      email: 'member1@test.com',
      role: UserRole.USER,
      avatar: '/avatars/member1.jpg',
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'member-2',
      name: 'Team Member 2',
      email: 'member2@test.com',
      role: UserRole.USER,
      avatar: '/avatars/member2.jpg',
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  tags: ['frontend', 'react', 'ui'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

describe('ProjectCard Component', () => {
  beforeAll(() => {
    matchMedia = new MatchMediaMock();
  });

  afterAll(() => {
    matchMedia.clear();
  });

  beforeEach(() => {
    matchMedia.clear();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders project information correctly', () => {
      const mockProject = createMockProject();
      renderProjectCard({ project: mockProject });

      // Verify basic project information
      expect(screen.getByText(mockProject.name)).toBeInTheDocument();
      expect(screen.getByText(mockProject.description)).toBeInTheDocument();
      expect(screen.getByText(`Priority: ${mockProject.priority}`)).toBeInTheDocument();
      
      // Verify status indicator
      const statusElement = screen.getByText(mockProject.status);
      expect(statusElement).toBeInTheDocument();
      expect(statusElement).toHaveStyle({
        backgroundColor: 'var(--color-success)'
      });

      // Verify progress bar
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      
      // Verify dates
      expect(screen.getByText(/Start: Jan 1, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Due: Dec 31, 2024/)).toBeInTheDocument();
    });

    it('renders member avatars correctly', () => {
      const mockProject = createMockProject();
      renderProjectCard({ project: mockProject });

      // Check member avatars
      mockProject.members.forEach(member => {
        const avatar = screen.getByAltText(member.name);
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveAttribute('src', member.avatar || '/default-avatar.png');
      });
    });

    it('renders tags when present', () => {
      const mockProject = createMockProject();
      renderProjectCard({ project: mockProject });

      mockProject.tags.forEach(tag => {
        expect(screen.getByText(tag)).toBeInTheDocument();
      });
    });
  });

  describe('Interaction', () => {
    it('handles click events when interactive', async () => {
      const mockProject = createMockProject();
      const handleClick = jest.fn();
      renderProjectCard({ 
        project: mockProject, 
        onClick: handleClick 
      });

      const card = screen.getByTestId(`project-card-${mockProject.id}`);
      await userEvent.click(card);
      expect(handleClick).toHaveBeenCalledWith(mockProject);
    });

    it('supports keyboard navigation', async () => {
      const mockProject = createMockProject();
      const handleClick = jest.fn();
      renderProjectCard({ 
        project: mockProject, 
        onClick: handleClick 
      });

      const card = screen.getByTestId(`project-card-${mockProject.id}`);
      card.focus();
      await userEvent.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledWith(mockProject);

      await userEvent.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Responsive Design', () => {
    it('adjusts layout for mobile viewport', () => {
      matchMedia.useMediaQuery('(max-width: 400px)');
      const mockProject = createMockProject();
      renderProjectCard({ 
        project: mockProject,
        isCompact: true
      });

      const description = screen.getByText(mockProject.description);
      expect(description).toHaveStyle({
        '-webkit-line-clamp': '1'
      });

      const tags = screen.queryByText(mockProject.tags[0]);
      expect(tags).not.toBeVisible();
    });

    it('shows all content in desktop viewport', () => {
      matchMedia.useMediaQuery('(min-width: 401px)');
      const mockProject = createMockProject();
      renderProjectCard({ project: mockProject });

      const description = screen.getByText(mockProject.description);
      expect(description).toHaveStyle({
        '-webkit-line-clamp': '2'
      });

      mockProject.tags.forEach(tag => {
        expect(screen.getByText(tag)).toBeVisible();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA attributes', () => {
      const mockProject = createMockProject();
      renderProjectCard({ project: mockProject });

      const card = screen.getByTestId(`project-card-${mockProject.id}`);
      expect(card).toHaveAttribute('aria-label', `Project: ${mockProject.name}`);
      expect(card).toHaveAttribute('aria-describedby', `project-description-${mockProject.id}`);
    });

    it('maintains proper focus management', async () => {
      const mockProject = createMockProject();
      renderProjectCard({ 
        project: mockProject,
        onClick: jest.fn()
      });

      const card = screen.getByTestId(`project-card-${mockProject.id}`);
      expect(card).toHaveAttribute('tabIndex', '0');
      
      card.focus();
      expect(card).toHaveFocus();
    });
  });

  describe('Theme Support', () => {
    it('renders correctly in light theme', () => {
      const mockProject = createMockProject();
      renderProjectCard({ project: mockProject }, lightTheme);

      const card = screen.getByTestId(`project-card-${mockProject.id}`);
      expect(card).toHaveStyle({
        backgroundColor: 'var(--color-background)'
      });
    });

    it('renders correctly in dark theme', () => {
      const mockProject = createMockProject();
      renderProjectCard({ project: mockProject }, darkTheme);

      const card = screen.getByTestId(`project-card-${mockProject.id}`);
      expect(card).toHaveStyle({
        backgroundColor: 'var(--color-background)'
      });
    });
  });
});