import { createSelector } from '@reduxjs/toolkit';
import { ITaskState } from './task.types';
import { ITask } from '../../interfaces/task.interface';

/**
 * Base selector to access the task state slice from root state
 * @param {RootState} state - The root Redux state
 * @returns {ITaskState} The task state slice
 */
export const selectTaskState = (state: RootState): ITaskState => state.task;

/**
 * Memoized selector to get all tasks
 * Performance optimized through createSelector memoization
 */
export const selectTasks = createSelector(
    [selectTaskState],
    (taskState: ITaskState): ITask[] => taskState.tasks
);

/**
 * Memoized selector factory to get a specific task by ID
 * Returns undefined if task is not found
 * @param {string} taskId - The ID of the task to retrieve
 */
export const selectTaskById = (taskId: string) => createSelector(
    [selectTasks],
    (tasks: ITask[]): ITask | undefined => 
        tasks.find((task) => task.id === taskId)
);

/**
 * Memoized selector to get tasks filtered by status
 * Type-safe using TaskStatus enum
 * @param {TaskStatus} status - The status to filter by
 */
export const selectTasksByStatus = (status: TaskStatus) => createSelector(
    [selectTasks],
    (tasks: ITask[]): ITask[] => 
        tasks.filter((task) => task.status === status)
);

/**
 * Memoized selector for task loading state
 * Boolean type-safe for loading indicator usage
 */
export const selectTasksLoading = createSelector(
    [selectTaskState],
    (taskState: ITaskState): boolean => taskState.loading
);

/**
 * Memoized selector for task error state
 * Null-safe for error handling
 */
export const selectTasksError = createSelector(
    [selectTaskState],
    (taskState: ITaskState): string | null => taskState.error
);

/**
 * Memoized selector for task pagination data
 * Type-safe pagination object with proper number typing
 */
export const selectTasksPagination = createSelector(
    [selectTaskState],
    (taskState: ITaskState): { totalCount: number; currentPage: number } => ({
        totalCount: taskState.totalCount,
        currentPage: taskState.currentPage
    })
);

/**
 * Memoized selector for optimistic updates
 * Returns map of pending task updates
 */
export const selectOptimisticUpdates = createSelector(
    [selectTaskState],
    (taskState: ITaskState): Map<string, ITask> => taskState.optimisticUpdates
);

/**
 * Memoized selector for last sync timestamp
 * Used for WebSocket sync management
 */
export const selectLastSyncTimestamp = createSelector(
    [selectTaskState],
    (taskState: ITaskState): number => taskState.lastSyncTimestamp
);

/**
 * Type for the root state containing task slice
 * Inferred from the selectTaskState usage
 */
type RootState = {
    task: ITaskState;
};