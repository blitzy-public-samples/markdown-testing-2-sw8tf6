import { createReducer } from '@reduxjs/toolkit'; // v2.x
import { ProjectActionTypes, ProjectState, ProjectAction } from './project.types';
import { ProjectStatus } from '../../interfaces/project.interface';

/**
 * Initial state for project management
 * Includes projects array, selected project, loading state, and error handling
 */
const initialState: ProjectState = {
    projects: [],
    selectedProject: null,
    loading: false,
    error: null,
    lastUpdated: null,
    sortOrder: 'asc',
    filter: null
};

/**
 * Project reducer implementing comprehensive project state management
 * Uses Redux Toolkit's createReducer for immutable updates and type safety
 */
const projectReducer = createReducer(initialState, (builder) => {
    builder
        // Fetch Projects
        .addCase(ProjectActionTypes.FETCH_PROJECTS, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(ProjectActionTypes.FETCH_PROJECTS_SUCCESS, (state, action) => {
            state.projects = action.payload;
            state.loading = false;
            state.lastUpdated = new Date().toISOString();
            state.error = null;
        })
        .addCase(ProjectActionTypes.FETCH_PROJECTS_FAILURE, (state, action) => {
            state.loading = false;
            state.error = action.payload;
        })

        // Create Project
        .addCase(ProjectActionTypes.CREATE_PROJECT, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(ProjectActionTypes.CREATE_PROJECT_SUCCESS, (state, action) => {
            state.projects.push(action.payload);
            state.loading = false;
            state.lastUpdated = new Date().toISOString();
            state.error = null;
        })
        .addCase(ProjectActionTypes.CREATE_PROJECT_FAILURE, (state, action) => {
            state.loading = false;
            state.error = action.payload;
        })

        // Update Project
        .addCase(ProjectActionTypes.UPDATE_PROJECT, (state, action) => {
            state.loading = true;
            state.error = null;
            // Optimistic update
            const index = state.projects.findIndex(p => p.id === action.payload.id);
            if (index !== -1) {
                state.projects[index] = {
                    ...state.projects[index],
                    ...action.payload.updates,
                    updatedAt: new Date()
                };
            }
        })
        .addCase(ProjectActionTypes.UPDATE_PROJECT_SUCCESS, (state, action) => {
            const index = state.projects.findIndex(p => p.id === action.payload.id);
            if (index !== -1) {
                state.projects[index] = action.payload;
            }
            state.loading = false;
            state.lastUpdated = new Date().toISOString();
            state.error = null;
            
            // Update selected project if it was the one being updated
            if (state.selectedProject?.id === action.payload.id) {
                state.selectedProject = action.payload;
            }
        })
        .addCase(ProjectActionTypes.UPDATE_PROJECT_FAILURE, (state, action) => {
            state.loading = false;
            state.error = action.payload;
            // Revert optimistic update by re-fetching the project list
            // This will be handled by the thunk action creator
        })

        // Delete Project
        .addCase(ProjectActionTypes.DELETE_PROJECT, (state, action) => {
            state.loading = true;
            state.error = null;
            // Optimistic delete
            state.projects = state.projects.filter(p => p.id !== action.payload);
        })
        .addCase(ProjectActionTypes.DELETE_PROJECT_SUCCESS, (state, action) => {
            // Confirm deletion
            state.projects = state.projects.filter(p => p.id !== action.payload);
            state.loading = false;
            state.lastUpdated = new Date().toISOString();
            state.error = null;
            
            // Clear selected project if it was the one being deleted
            if (state.selectedProject?.id === action.payload) {
                state.selectedProject = null;
            }
        })
        .addCase(ProjectActionTypes.DELETE_PROJECT_FAILURE, (state, action) => {
            state.loading = false;
            state.error = action.payload;
            // Revert optimistic delete by re-fetching the project list
            // This will be handled by the thunk action creator
        })

        // Select Project
        .addCase(ProjectActionTypes.SELECT_PROJECT, (state, action) => {
            state.selectedProject = action.payload;
            state.error = null;
        })

        // Clear Error
        .addCase(ProjectActionTypes.CLEAR_PROJECT_ERROR, (state) => {
            state.error = null;
        })

        // Sort Projects
        .addCase('SORT_PROJECTS', (state, action) => {
            state.sortOrder = action.payload;
            state.projects = [...state.projects].sort((a, b) => {
                const order = state.sortOrder === 'asc' ? 1 : -1;
                return a.name.localeCompare(b.name) * order;
            });
        })

        // Filter Projects
        .addCase('FILTER_PROJECTS', (state, action) => {
            state.filter = action.payload;
        })

        // Reset State
        .addCase('RESET_PROJECT_STATE', () => {
            return initialState;
        });
});

export default projectReducer;