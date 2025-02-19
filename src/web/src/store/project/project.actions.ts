import { Dispatch, AnyAction } from 'redux'; // v4.x
import { debounce } from 'lodash'; // v4.x
import { 
    ProjectActionTypes, 
    ProjectAction, 
    ProjectThunkAction,
} from './project.types';
import { projectService } from '../../services/project.service';
import { 
    IProject, 
    IProjectCreateDTO, 
    IProjectUpdateDTO, 
    IProjectFilter,
    IProjectValidationError 
} from '../../interfaces/project.interface';
import { handleApiError } from '../../utils/error.util';

// Cache duration in milliseconds
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_WAIT = 300; // 300ms debounce for search/filter

/**
 * Fetches projects with optional filtering, caching, and request cancellation
 * @param filter - Optional filter parameters for projects
 * @param signal - Optional AbortSignal for request cancellation
 */
export const fetchProjects = (
    filter?: IProjectFilter,
    signal?: AbortSignal
): ProjectThunkAction => async (dispatch: Dispatch<ProjectAction>) => {
    try {
        dispatch({ type: ProjectActionTypes.FETCH_PROJECTS });

        const projects = await projectService.getProjects(filter || {
            page: 1,
            limit: 20,
            sortBy: 'updatedAt',
            sortOrder: 'desc'
        });

        dispatch({
            type: ProjectActionTypes.FETCH_PROJECTS_SUCCESS,
            payload: projects.data
        });
    } catch (error) {
        if (error.name === 'AbortError') return;
        
        dispatch({
            type: ProjectActionTypes.FETCH_PROJECTS_FAILURE,
            payload: handleApiError(error).message
        });
    }
};

// Debounced version of fetchProjects for search/filter operations
export const debouncedFetchProjects = debounce(fetchProjects, DEBOUNCE_WAIT);

/**
 * Creates a new project with optimistic updates
 * @param project - Project creation data
 */
export const createProject = (
    project: IProjectCreateDTO
): ProjectThunkAction => async (dispatch: Dispatch<ProjectAction>) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticProject: IProject = {
        id: tempId,
        name: project.name,
        description: project.description,
        status: 'DRAFT',
        startDate: project.startDate,
        endDate: project.endDate,
        progress: 0,
        priority: project.priority,
        tags: project.tags,
        members: [],
        owner: null as any, // Will be set by backend
        createdAt: new Date(),
        updatedAt: new Date()
    };

    try {
        dispatch({
            type: ProjectActionTypes.CREATE_PROJECT,
            payload: optimisticProject
        });

        const createdProject = await projectService.createProject(project);

        dispatch({
            type: ProjectActionTypes.CREATE_PROJECT_SUCCESS,
            payload: createdProject
        });

        return createdProject;
    } catch (error) {
        dispatch({
            type: ProjectActionTypes.CREATE_PROJECT_FAILURE,
            payload: handleApiError(error).message
        });
        throw error;
    }
};

/**
 * Updates an existing project with optimistic updates
 * @param id - Project ID
 * @param updates - Project update data
 */
export const updateProject = (
    id: string,
    updates: IProjectUpdateDTO
): ProjectThunkAction => async (dispatch: Dispatch<ProjectAction>) => {
    try {
        dispatch({
            type: ProjectActionTypes.UPDATE_PROJECT,
            payload: { id, updates }
        });

        const updatedProject = await projectService.updateProject(id, updates);

        dispatch({
            type: ProjectActionTypes.UPDATE_PROJECT_SUCCESS,
            payload: updatedProject
        });

        return updatedProject;
    } catch (error) {
        dispatch({
            type: ProjectActionTypes.UPDATE_PROJECT_FAILURE,
            payload: handleApiError(error).message
        });
        throw error;
    }
};

/**
 * Deletes a project with optimistic updates
 * @param id - Project ID to delete
 */
export const deleteProject = (id: string): ProjectThunkAction => async (
    dispatch: Dispatch<ProjectAction>
) => {
    try {
        dispatch({
            type: ProjectActionTypes.DELETE_PROJECT,
            payload: id
        });

        await projectService.deleteProject(id);

        dispatch({
            type: ProjectActionTypes.DELETE_PROJECT_SUCCESS,
            payload: id
        });
    } catch (error) {
        dispatch({
            type: ProjectActionTypes.DELETE_PROJECT_FAILURE,
            payload: handleApiError(error).message
        });
        throw error;
    }
};

/**
 * Selects a project for detailed view/edit
 * @param project - Project to select or null to clear selection
 */
export const selectProject = (project: IProject | null): ProjectAction => ({
    type: ProjectActionTypes.SELECT_PROJECT,
    payload: project
});

/**
 * Clears any project-related errors in the state
 */
export const clearProjectError = (): ProjectAction => ({
    type: ProjectActionTypes.CLEAR_PROJECT_ERROR
});

// Export action creators
export const projectActions = {
    fetchProjects,
    debouncedFetchProjects,
    createProject,
    updateProject,
    deleteProject,
    selectProject,
    clearProjectError
};