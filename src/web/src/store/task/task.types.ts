import { 
    ITask, 
    TaskStatus, 
    ITaskCreateDTO, 
    ITaskUpdateDTO, 
    ITaskFilter 
} from '../../interfaces/task.interface';

/**
 * Enumeration of all possible Redux action types for task management
 * Includes CRUD operations and WebSocket event handling
 */
export enum TaskActionTypes {
    // Fetch tasks
    FETCH_TASKS_REQUEST = '@task/FETCH_TASKS_REQUEST',
    FETCH_TASKS_SUCCESS = '@task/FETCH_TASKS_SUCCESS',
    FETCH_TASKS_FAILURE = '@task/FETCH_TASKS_FAILURE',

    // Create task
    CREATE_TASK_REQUEST = '@task/CREATE_TASK_REQUEST',
    CREATE_TASK_SUCCESS = '@task/CREATE_TASK_SUCCESS',
    CREATE_TASK_FAILURE = '@task/CREATE_TASK_FAILURE',

    // Update task
    UPDATE_TASK_REQUEST = '@task/UPDATE_TASK_REQUEST',
    UPDATE_TASK_SUCCESS = '@task/UPDATE_TASK_SUCCESS',
    UPDATE_TASK_FAILURE = '@task/UPDATE_TASK_FAILURE',

    // Delete task
    DELETE_TASK_REQUEST = '@task/DELETE_TASK_REQUEST',
    DELETE_TASK_SUCCESS = '@task/DELETE_TASK_SUCCESS',
    DELETE_TASK_FAILURE = '@task/DELETE_TASK_FAILURE',

    // WebSocket events
    TASK_UPDATED_WS = '@task/TASK_UPDATED_WS',
    TASK_DELETED_WS = '@task/TASK_DELETED_WS'
}

/**
 * Interface for the task state in Redux store
 * Includes support for optimistic updates and real-time sync
 */
export interface ITaskState {
    /** Array of tasks in the current view */
    tasks: ITask[];
    
    /** Loading state indicator */
    loading: boolean;
    
    /** Error message if any */
    error: string | null;
    
    /** Total count of tasks for pagination */
    totalCount: number;
    
    /** Current page number */
    currentPage: number;
    
    /** Last sync timestamp for WebSocket updates */
    lastSyncTimestamp: number;
    
    /** Map of optimistic updates pending confirmation */
    optimisticUpdates: Map<string, ITask>;
}

// Fetch tasks action interfaces
export interface FetchTasksRequestAction {
    type: typeof TaskActionTypes.FETCH_TASKS_REQUEST;
    payload: ITaskFilter;
}

export interface FetchTasksSuccessAction {
    type: typeof TaskActionTypes.FETCH_TASKS_SUCCESS;
    payload: {
        tasks: ITask[];
        totalCount: number;
        currentPage: number;
    };
}

export interface FetchTasksFailureAction {
    type: typeof TaskActionTypes.FETCH_TASKS_FAILURE;
    payload: string;
}

// Create task action interfaces
export interface CreateTaskRequestAction {
    type: typeof TaskActionTypes.CREATE_TASK_REQUEST;
    payload: ITaskCreateDTO;
}

export interface CreateTaskSuccessAction {
    type: typeof TaskActionTypes.CREATE_TASK_SUCCESS;
    payload: ITask;
}

export interface CreateTaskFailureAction {
    type: typeof TaskActionTypes.CREATE_TASK_FAILURE;
    payload: string;
}

// Update task action interfaces
export interface UpdateTaskRequestAction {
    type: typeof TaskActionTypes.UPDATE_TASK_REQUEST;
    payload: {
        taskId: string;
        updates: ITaskUpdateDTO;
    };
}

export interface UpdateTaskSuccessAction {
    type: typeof TaskActionTypes.UPDATE_TASK_SUCCESS;
    payload: ITask;
}

export interface UpdateTaskFailureAction {
    type: typeof TaskActionTypes.UPDATE_TASK_FAILURE;
    payload: {
        taskId: string;
        error: string;
    };
}

// Delete task action interfaces
export interface DeleteTaskRequestAction {
    type: typeof TaskActionTypes.DELETE_TASK_REQUEST;
    payload: string; // taskId
}

export interface DeleteTaskSuccessAction {
    type: typeof TaskActionTypes.DELETE_TASK_SUCCESS;
    payload: string; // taskId
}

export interface DeleteTaskFailureAction {
    type: typeof TaskActionTypes.DELETE_TASK_FAILURE;
    payload: {
        taskId: string;
        error: string;
    };
}

// WebSocket event action interfaces
export interface TaskUpdatedWSAction {
    type: typeof TaskActionTypes.TASK_UPDATED_WS;
    payload: {
        task: ITask;
        timestamp: number;
    };
}

export interface TaskDeletedWSAction {
    type: typeof TaskActionTypes.TASK_DELETED_WS;
    payload: {
        taskId: string;
        timestamp: number;
    };
}

/**
 * Union type of all possible task actions
 * Used for type checking in reducers and middleware
 */
export type TaskAction =
    | FetchTasksRequestAction
    | FetchTasksSuccessAction
    | FetchTasksFailureAction
    | CreateTaskRequestAction
    | CreateTaskSuccessAction
    | CreateTaskFailureAction
    | UpdateTaskRequestAction
    | UpdateTaskSuccessAction
    | UpdateTaskFailureAction
    | DeleteTaskRequestAction
    | DeleteTaskSuccessAction
    | DeleteTaskFailureAction
    | TaskUpdatedWSAction
    | TaskDeletedWSAction;