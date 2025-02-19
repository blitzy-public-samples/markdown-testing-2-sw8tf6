import { ThunkAction } from '@reduxjs/toolkit'; // v2.x
import { RootState } from '@reduxjs/toolkit'; // v2.x
import { IProject, IProjectCreateDTO, IProjectUpdateDTO } from '../../interfaces/project.interface';

/**
 * Enumeration of all possible project-related Redux action types
 * Provides type safety and centralized action type definitions
 */
export enum ProjectActionTypes {
    FETCH_PROJECTS = '@project/FETCH_PROJECTS',
    FETCH_PROJECTS_SUCCESS = '@project/FETCH_PROJECTS_SUCCESS',
    FETCH_PROJECTS_FAILURE = '@project/FETCH_PROJECTS_FAILURE',
    
    CREATE_PROJECT = '@project/CREATE_PROJECT',
    CREATE_PROJECT_SUCCESS = '@project/CREATE_PROJECT_SUCCESS',
    CREATE_PROJECT_FAILURE = '@project/CREATE_PROJECT_FAILURE',
    
    UPDATE_PROJECT = '@project/UPDATE_PROJECT',
    UPDATE_PROJECT_SUCCESS = '@project/UPDATE_PROJECT_SUCCESS',
    UPDATE_PROJECT_FAILURE = '@project/UPDATE_PROJECT_FAILURE',
    
    DELETE_PROJECT = '@project/DELETE_PROJECT',
    DELETE_PROJECT_SUCCESS = '@project/DELETE_PROJECT_SUCCESS',
    DELETE_PROJECT_FAILURE = '@project/DELETE_PROJECT_FAILURE',
    
    SELECT_PROJECT = '@project/SELECT_PROJECT',
    CLEAR_PROJECT_ERROR = '@project/CLEAR_PROJECT_ERROR'
}

/**
 * Interface defining the shape of project state in Redux store
 * Includes loading states and error handling
 */
export interface ProjectState {
    projects: IProject[];
    selectedProject: IProject | null;
    loading: boolean;
    error: string | null;
}

// Action Interfaces

export interface FetchProjectsAction {
    type: ProjectActionTypes.FETCH_PROJECTS;
}

export interface FetchProjectsSuccessAction {
    type: ProjectActionTypes.FETCH_PROJECTS_SUCCESS;
    payload: IProject[];
}

export interface FetchProjectsFailureAction {
    type: ProjectActionTypes.FETCH_PROJECTS_FAILURE;
    payload: string;
}

export interface CreateProjectAction {
    type: ProjectActionTypes.CREATE_PROJECT;
    payload: IProjectCreateDTO;
}

export interface CreateProjectSuccessAction {
    type: ProjectActionTypes.CREATE_PROJECT_SUCCESS;
    payload: IProject;
}

export interface CreateProjectFailureAction {
    type: ProjectActionTypes.CREATE_PROJECT_FAILURE;
    payload: string;
}

export interface UpdateProjectAction {
    type: ProjectActionTypes.UPDATE_PROJECT;
    payload: {
        id: string;
        updates: IProjectUpdateDTO;
    };
}

export interface UpdateProjectSuccessAction {
    type: ProjectActionTypes.UPDATE_PROJECT_SUCCESS;
    payload: IProject;
}

export interface UpdateProjectFailureAction {
    type: ProjectActionTypes.UPDATE_PROJECT_FAILURE;
    payload: string;
}

export interface DeleteProjectAction {
    type: ProjectActionTypes.DELETE_PROJECT;
    payload: string; // project id
}

export interface DeleteProjectSuccessAction {
    type: ProjectActionTypes.DELETE_PROJECT_SUCCESS;
    payload: string; // project id
}

export interface DeleteProjectFailureAction {
    type: ProjectActionTypes.DELETE_PROJECT_FAILURE;
    payload: string;
}

export interface SelectProjectAction {
    type: ProjectActionTypes.SELECT_PROJECT;
    payload: IProject | null;
}

export interface ClearProjectErrorAction {
    type: ProjectActionTypes.CLEAR_PROJECT_ERROR;
}

/**
 * Union type of all possible project actions
 * Ensures type safety in reducers and action creators
 */
export type ProjectAction =
    | FetchProjectsAction
    | FetchProjectsSuccessAction
    | FetchProjectsFailureAction
    | CreateProjectAction
    | CreateProjectSuccessAction
    | CreateProjectFailureAction
    | UpdateProjectAction
    | UpdateProjectSuccessAction
    | UpdateProjectFailureAction
    | DeleteProjectAction
    | DeleteProjectSuccessAction
    | DeleteProjectFailureAction
    | SelectProjectAction
    | ClearProjectErrorAction;

/**
 * Type for project-related thunk actions
 * Provides type safety for async operations
 */
export type ProjectThunkAction = ThunkAction<
    Promise<void>,
    RootState,
    unknown,
    ProjectAction
>;