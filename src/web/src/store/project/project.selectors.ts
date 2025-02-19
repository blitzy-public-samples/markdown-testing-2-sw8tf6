import { createSelector } from '@reduxjs/toolkit'; // v2.x
import { RootState } from '@reduxjs/toolkit'; // v2.x
import { ProjectState, IProject } from './project.types';

/**
 * Base selector to access the project state slice from the root state
 * Provides type-safe access to project state
 * @param {RootState} state - The root Redux state
 * @returns {ProjectState} The project state slice
 */
export const selectProjectState = (state: RootState): ProjectState => state.projects;

/**
 * Memoized selector to get all projects
 * Prevents unnecessary re-renders by memoizing the projects array
 * Returns empty array as fallback for undefined state
 */
export const selectProjects = createSelector(
    [selectProjectState],
    (projectState: ProjectState): IProject[] => projectState?.projects || []
);

/**
 * Memoized selector to get the currently selected project
 * Provides null-safety and prevents unnecessary re-renders
 * Returns null as fallback for undefined state
 */
export const selectSelectedProject = createSelector(
    [selectProjectState],
    (projectState: ProjectState): IProject | null => projectState?.selectedProject || null
);

/**
 * Memoized selector to get the loading state
 * Optimizes performance by preventing unnecessary re-renders
 * Returns false as fallback for undefined state
 */
export const selectProjectLoading = createSelector(
    [selectProjectState],
    (projectState: ProjectState): boolean => projectState?.loading || false
);

/**
 * Memoized selector to get any project-related error
 * Provides null-safety and prevents unnecessary re-renders
 * Returns null as fallback for undefined state
 */
export const selectProjectError = createSelector(
    [selectProjectState],
    (projectState: ProjectState): string | null => projectState?.error || null
);

/**
 * Memoized selector to get projects filtered by status
 * @param {string} status - The project status to filter by
 */
export const selectProjectsByStatus = createSelector(
    [selectProjects, (_state: RootState, status: string) => status],
    (projects: IProject[], status: string): IProject[] => 
        projects.filter(project => project.status === status)
);

/**
 * Memoized selector to get projects by priority
 * @param {string} priority - The priority level to filter by
 */
export const selectProjectsByPriority = createSelector(
    [selectProjects, (_state: RootState, priority: string) => priority],
    (projects: IProject[], priority: string): IProject[] =>
        projects.filter(project => project.priority === priority)
);

/**
 * Memoized selector to get projects by owner ID
 * @param {string} ownerId - The ID of the project owner
 */
export const selectProjectsByOwner = createSelector(
    [selectProjects, (_state: RootState, ownerId: string) => ownerId],
    (projects: IProject[], ownerId: string): IProject[] =>
        projects.filter(project => project.owner.id === ownerId)
);

/**
 * Memoized selector to get projects by team member ID
 * @param {string} memberId - The ID of the team member
 */
export const selectProjectsByMember = createSelector(
    [selectProjects, (_state: RootState, memberId: string) => memberId],
    (projects: IProject[], memberId: string): IProject[] =>
        projects.filter(project => project.members.some(member => member.id === memberId))
);

/**
 * Memoized selector to get active projects count
 * Optimizes performance by preventing unnecessary recalculations
 */
export const selectActiveProjectsCount = createSelector(
    [selectProjects],
    (projects: IProject[]): number =>
        projects.filter(project => project.status === 'ACTIVE').length
);

/**
 * Memoized selector to get projects completion statistics
 * Returns an object with completion metrics
 */
export const selectProjectsStats = createSelector(
    [selectProjects],
    (projects: IProject[]) => ({
        total: projects.length,
        completed: projects.filter(p => p.status === 'COMPLETED').length,
        inProgress: projects.filter(p => p.status === 'ACTIVE').length,
        blocked: projects.filter(p => p.status === 'BLOCKED').length,
        averageProgress: projects.length
            ? projects.reduce((acc, p) => acc + p.progress, 0) / projects.length
            : 0
    })
);