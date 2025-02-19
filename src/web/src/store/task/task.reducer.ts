import { ITask } from '../../interfaces/task.interface';
import { 
    TaskActionTypes, 
    TaskAction, 
    ITaskState 
} from './task.types';

/**
 * Initial state for task management
 * Includes support for optimistic updates and WebSocket connection status
 */
const initialState: ITaskState = {
    tasks: [],
    loading: false,
    error: null,
    totalCount: 0,
    currentPage: 1,
    lastSyncTimestamp: 0,
    optimisticUpdates: new Map(),
    wsConnected: false
};

/**
 * Redux reducer for task management with real-time updates and optimistic updates
 * Handles CRUD operations, WebSocket events, and optimistic update rollbacks
 * @param state - Current task state
 * @param action - Dispatched action
 * @returns Updated task state
 */
export const taskReducer = (
    state: ITaskState = initialState,
    action: TaskAction
): ITaskState => {
    switch (action.type) {
        // Fetch tasks
        case TaskActionTypes.FETCH_TASKS_REQUEST:
            return {
                ...state,
                loading: true,
                error: null
            };

        case TaskActionTypes.FETCH_TASKS_SUCCESS:
            return {
                ...state,
                loading: false,
                tasks: action.payload.tasks,
                totalCount: action.payload.totalCount,
                currentPage: action.payload.currentPage,
                error: null
            };

        case TaskActionTypes.FETCH_TASKS_FAILURE:
            return {
                ...state,
                loading: false,
                error: action.payload
            };

        // Create task
        case TaskActionTypes.CREATE_TASK_REQUEST:
            return {
                ...state,
                loading: true,
                error: null
            };

        case TaskActionTypes.CREATE_TASK_SUCCESS:
            return {
                ...state,
                loading: false,
                tasks: [action.payload, ...state.tasks],
                totalCount: state.totalCount + 1,
                error: null
            };

        case TaskActionTypes.CREATE_TASK_FAILURE:
            return {
                ...state,
                loading: false,
                error: action.payload
            };

        // Update task with optimistic updates
        case TaskActionTypes.UPDATE_TASK_REQUEST:
            const optimisticTask = state.tasks.find(
                task => task.id === action.payload.taskId
            );
            if (!optimisticTask) return state;

            const updatedOptimisticTask = {
                ...optimisticTask,
                ...action.payload.updates,
                updatedAt: new Date()
            };

            // Store original task for potential rollback
            const newOptimisticUpdates = new Map(state.optimisticUpdates);
            newOptimisticUpdates.set(action.payload.taskId, optimisticTask);

            return {
                ...state,
                tasks: state.tasks.map(task =>
                    task.id === action.payload.taskId ? updatedOptimisticTask : task
                ),
                optimisticUpdates: newOptimisticUpdates,
                error: null
            };

        case TaskActionTypes.UPDATE_TASK_SUCCESS:
            // Clear optimistic update after successful server update
            const successOptimisticUpdates = new Map(state.optimisticUpdates);
            successOptimisticUpdates.delete(action.payload.id);

            return {
                ...state,
                loading: false,
                tasks: state.tasks.map(task =>
                    task.id === action.payload.id ? action.payload : task
                ),
                optimisticUpdates: successOptimisticUpdates,
                error: null
            };

        case TaskActionTypes.UPDATE_TASK_FAILURE:
            // Rollback to original task state on failure
            const originalTask = state.optimisticUpdates.get(action.payload.taskId);
            const failureOptimisticUpdates = new Map(state.optimisticUpdates);
            failureOptimisticUpdates.delete(action.payload.taskId);

            return {
                ...state,
                loading: false,
                tasks: state.tasks.map(task =>
                    task.id === action.payload.taskId && originalTask
                        ? originalTask
                        : task
                ),
                optimisticUpdates: failureOptimisticUpdates,
                error: action.payload.error
            };

        // Delete task
        case TaskActionTypes.DELETE_TASK_REQUEST:
            return {
                ...state,
                loading: true,
                error: null
            };

        case TaskActionTypes.DELETE_TASK_SUCCESS:
            return {
                ...state,
                loading: false,
                tasks: state.tasks.filter(task => task.id !== action.payload),
                totalCount: state.totalCount - 1,
                error: null
            };

        case TaskActionTypes.DELETE_TASK_FAILURE:
            return {
                ...state,
                loading: false,
                error: action.payload.error
            };

        // WebSocket real-time updates
        case TaskActionTypes.TASK_UPDATED_WS:
            // Handle conflicts between optimistic updates and server updates
            if (state.optimisticUpdates.has(action.payload.task.id)) {
                const optimisticTimestamp = state.optimisticUpdates.get(action.payload.task.id)?.updatedAt.getTime() || 0;
                if (action.payload.timestamp < optimisticTimestamp) {
                    // Ignore older server updates if there's a pending optimistic update
                    return state;
                }
            }

            return {
                ...state,
                tasks: state.tasks.map(task =>
                    task.id === action.payload.task.id ? action.payload.task : task
                ),
                lastSyncTimestamp: action.payload.timestamp
            };

        case TaskActionTypes.TASK_DELETED_WS:
            return {
                ...state,
                tasks: state.tasks.filter(task => task.id !== action.payload.taskId),
                totalCount: state.totalCount - 1,
                lastSyncTimestamp: action.payload.timestamp
            };

        // WebSocket connection status
        case TaskActionTypes.WS_CONNECTED:
            return {
                ...state,
                wsConnected: true
            };

        case TaskActionTypes.WS_DISCONNECTED:
            return {
                ...state,
                wsConnected: false
            };

        default:
            return state;
    }
};