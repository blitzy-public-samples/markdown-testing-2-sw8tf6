import { createAction, createAsyncThunk } from '@reduxjs/toolkit';
import { validate } from 'class-validator'; // ^0.14.0
import { cacheManager } from 'cache-manager'; // ^5.0.0
import retry from 'axios-retry'; // ^3.5.0

import { handleApiError, createError } from '../../utils/error.util';
import { wsService } from '../../services/websocket.service';
import { taskService } from '../../services/task.service';
import { AppError } from '../../utils/error.util';

// Cache configuration
const TASK_CACHE_TTL = 5 * 60; // 5 minutes
const TASK_CACHE_KEY = 'tasks';

// Action Types
export const FETCH_TASKS_REQUEST = 'task/fetchTasksRequest';
export const FETCH_TASKS_SUCCESS = 'task/fetchTasksSuccess';
export const FETCH_TASKS_FAILURE = 'task/fetchTasksFailure';

export const CREATE_TASK_REQUEST = 'task/createTaskRequest';
export const CREATE_TASK_SUCCESS = 'task/createTaskSuccess';
export const CREATE_TASK_FAILURE = 'task/createTaskFailure';

export const UPDATE_TASK_REQUEST = 'task/updateTaskRequest';
export const UPDATE_TASK_SUCCESS = 'task/updateTaskSuccess';
export const UPDATE_TASK_FAILURE = 'task/updateTaskFailure';

export const DELETE_TASK_REQUEST = 'task/deleteTaskRequest';
export const DELETE_TASK_SUCCESS = 'task/deleteTaskSuccess';
export const DELETE_TASK_FAILURE = 'task/deleteTaskFailure';

export const SET_TASK_FILTER = 'task/setTaskFilter';
export const CLEAR_TASK_ERROR = 'task/clearError';
export const RECEIVE_TASK_UPDATE = 'task/receiveUpdate';

// Interfaces
export interface ITaskFilter {
  status?: string;
  assigneeId?: string;
  projectId?: string;
  priority?: string;
  dueDate?: Date;
  page?: number;
  limit?: number;
}

export interface ITaskCreateDTO {
  title: string;
  description: string;
  assigneeId: string;
  projectId: string;
  priority: string;
  dueDate: Date;
  attachments?: File[];
}

export interface ITaskUpdateDTO extends Partial<ITaskCreateDTO> {
  id: string;
  status?: string;
}

// Synchronous Actions
export const setTaskFilter = createAction<ITaskFilter>(SET_TASK_FILTER);
export const clearTaskError = createAction(CLEAR_TASK_ERROR);
export const receiveTaskUpdate = createAction<any>(RECEIVE_TASK_UPDATE);

// Async Actions with Caching and Validation
export const fetchTasksWithCache = createAsyncThunk(
  FETCH_TASKS_REQUEST,
  async (filter: ITaskFilter, { rejectWithValue }) => {
    try {
      // Check cache first
      const cacheKey = `${TASK_CACHE_KEY}-${JSON.stringify(filter)}`;
      const cachedTasks = await cacheManager.get(cacheKey);
      
      if (cachedTasks) {
        return cachedTasks;
      }

      // Configure retry logic for network resilience
      const axiosWithRetry = retry(taskService.axiosInstance, { 
        retries: 3,
        retryDelay: retry.exponentialDelay,
        retryCondition: (error) => {
          return retry.isNetworkOrIdempotentRequestError(error);
        }
      });

      const response = await axiosWithRetry.get('/tasks', { params: filter });
      const tasks = response.data;

      // Cache the results
      await cacheManager.set(cacheKey, tasks, TASK_CACHE_TTL);

      return tasks;
    } catch (error) {
      const appError = handleApiError(error as Error);
      return rejectWithValue(appError);
    }
  }
);

export const createTaskWithValidation = createAsyncThunk(
  CREATE_TASK_REQUEST,
  async (taskData: ITaskCreateDTO, { rejectWithValue }) => {
    try {
      // Validate task data
      const errors = await validate(taskData);
      if (errors.length > 0) {
        throw createError('VALIDATION_INVALID_FORMAT', { 
          validationErrors: errors 
        });
      }

      const response = await taskService.createTask(taskData);
      const newTask = response.data;

      // Emit WebSocket event for real-time updates
      await wsService.emit('task:created', newTask, {
        acknowledgment: true,
        retries: 3
      });

      // Invalidate cache
      await cacheManager.del(TASK_CACHE_KEY);

      return newTask;
    } catch (error) {
      const appError = handleApiError(error as Error);
      return rejectWithValue(appError);
    }
  }
);

export const updateTaskWithValidation = createAsyncThunk(
  UPDATE_TASK_REQUEST,
  async (taskData: ITaskUpdateDTO, { rejectWithValue }) => {
    try {
      // Validate update data
      const errors = await validate(taskData);
      if (errors.length > 0) {
        throw createError('VALIDATION_INVALID_FORMAT', { 
          validationErrors: errors 
        });
      }

      const response = await taskService.updateTask(taskData.id, taskData);
      const updatedTask = response.data;

      // Emit WebSocket event for real-time updates
      await wsService.emit('task:updated', updatedTask, {
        acknowledgment: true,
        retries: 3
      });

      // Invalidate cache
      await cacheManager.del(TASK_CACHE_KEY);

      return updatedTask;
    } catch (error) {
      const appError = handleApiError(error as Error);
      return rejectWithValue(appError);
    }
  }
);

export const deleteTask = createAsyncThunk(
  DELETE_TASK_REQUEST,
  async (taskId: string, { rejectWithValue }) => {
    try {
      await taskService.deleteTask(taskId);

      // Emit WebSocket event for real-time updates
      await wsService.emit('task:deleted', { taskId }, {
        acknowledgment: true,
        retries: 3
      });

      // Invalidate cache
      await cacheManager.del(TASK_CACHE_KEY);

      return taskId;
    } catch (error) {
      const appError = handleApiError(error as Error);
      return rejectWithValue(appError);
    }
  }
);

// WebSocket subscription setup
export const setupTaskWebSocket = () => (dispatch: any) => {
  wsService.subscribe('task:updated', (task: any) => {
    dispatch(receiveTaskUpdate(task));
  });

  wsService.subscribe('task:created', (task: any) => {
    dispatch(receiveTaskUpdate(task));
  });

  wsService.subscribe('task:deleted', (taskId: string) => {
    dispatch(receiveTaskUpdate({ id: taskId, deleted: true }));
  });
};