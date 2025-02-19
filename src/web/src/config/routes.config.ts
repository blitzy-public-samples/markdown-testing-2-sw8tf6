/**
 * @fileoverview Application routing configuration with protected and public routes
 * Implements secure route protection, code splitting, and accessibility features
 * @version 1.0.0
 */

import { RouteObject } from 'react-router-dom';
import { lazy, Suspense } from 'react'; // v18.0.0
import { AuthGuard } from '@auth/react'; // v1.0.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0
import { PUBLIC_ROUTES, PROTECTED_ROUTES, ERROR_ROUTES } from '../constants/routes.constants';

// Lazy-loaded component declarations with explicit chunk names
const lazyRoutes = {
  // Auth routes
  Login: lazy(() => import(/* webpackChunkName: "auth" */ '../pages/auth/Login')),
  Register: lazy(() => import(/* webpackChunkName: "auth" */ '../pages/auth/Register')),
  MFASetup: lazy(() => import(/* webpackChunkName: "auth" */ '../pages/auth/MFASetup')),
  
  // Core application routes
  Dashboard: lazy(() => import(/* webpackChunkName: "dashboard" */ '../pages/dashboard/Dashboard')),
  
  // Task management routes
  Tasks: lazy(() => import(/* webpackChunkName: "tasks" */ '../pages/tasks/Tasks')),
  TaskCreate: lazy(() => import(/* webpackChunkName: "tasks" */ '../pages/tasks/TaskCreate')),
  TaskDetails: lazy(() => import(/* webpackChunkName: "tasks" */ '../pages/tasks/TaskDetails')),
  
  // Project management routes
  Projects: lazy(() => import(/* webpackChunkName: "projects" */ '../pages/projects/Projects')),
  ProjectCreate: lazy(() => import(/* webpackChunkName: "projects" */ '../pages/projects/ProjectCreate')),
  ProjectDetails: lazy(() => import(/* webpackChunkName: "projects" */ '../pages/projects/ProjectDetails')),
  
  // Settings and configuration routes
  Settings: lazy(() => import(/* webpackChunkName: "settings" */ '../pages/settings/Settings')),
  
  // Error pages
  Error404: lazy(() => import(/* webpackChunkName: "error" */ '../pages/errors/Error404')),
  Error500: lazy(() => import(/* webpackChunkName: "error" */ '../pages/errors/Error500')),
  Error403: lazy(() => import(/* webpackChunkName: "error" */ '../pages/errors/Error403'))
};

/**
 * Creates a protected route configuration with authentication and error handling
 * @param routeConfig - Base route configuration object
 * @param requiredRoles - Array of roles required to access the route
 * @returns Enhanced route configuration with security features
 */
const createProtectedRoute = (
  routeConfig: RouteObject,
  requiredRoles: string[] = []
): RouteObject => ({
  ...routeConfig,
  element: (
    <ErrorBoundary FallbackComponent={lazyRoutes.Error500}>
      <AuthGuard requiredRoles={requiredRoles}>
        <Suspense fallback={<div aria-label="Loading content">Loading...</div>}>
          {routeConfig.element}
        </Suspense>
      </AuthGuard>
    </ErrorBoundary>
  )
});

/**
 * Creates a route with optimized lazy loading and error boundaries
 * @param componentPath - Path to the component in lazyRoutes
 * @param prefetch - Whether to enable route prefetching
 * @returns Optimized route configuration
 */
const createLazyRoute = (
  componentPath: keyof typeof lazyRoutes,
  prefetch: boolean = false
): RouteObject['element'] => {
  const Component = lazyRoutes[componentPath];
  return (
    <ErrorBoundary FallbackComponent={lazyRoutes.Error500}>
      <Suspense fallback={<div aria-label="Loading content">Loading...</div>}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
};

// Public route configurations
const publicRoutes: RouteObject[] = [
  {
    path: PUBLIC_ROUTES.LOGIN,
    element: createLazyRoute('Login')
  },
  {
    path: PUBLIC_ROUTES.REGISTER,
    element: createLazyRoute('Register')
  },
  {
    path: PUBLIC_ROUTES.MFA_SETUP,
    element: createLazyRoute('MFASetup')
  }
];

// Protected route configurations
const protectedRoutes: RouteObject[] = [
  {
    path: PROTECTED_ROUTES.DASHBOARD,
    element: createProtectedRoute({
      element: createLazyRoute('Dashboard')
    })
  },
  {
    path: PROTECTED_ROUTES.TASKS.ROOT,
    element: createProtectedRoute({
      element: createLazyRoute('Tasks')
    }, ['user', 'admin'])
  },
  {
    path: PROTECTED_ROUTES.TASKS.CREATE,
    element: createProtectedRoute({
      element: createLazyRoute('TaskCreate')
    }, ['user', 'admin'])
  },
  {
    path: PROTECTED_ROUTES.TASKS.DETAILS,
    element: createProtectedRoute({
      element: createLazyRoute('TaskDetails')
    }, ['user', 'admin'])
  },
  {
    path: PROTECTED_ROUTES.PROJECTS.ROOT,
    element: createProtectedRoute({
      element: createLazyRoute('Projects')
    }, ['user', 'admin'])
  },
  {
    path: PROTECTED_ROUTES.PROJECTS.CREATE,
    element: createProtectedRoute({
      element: createLazyRoute('ProjectCreate')
    }, ['admin'])
  },
  {
    path: PROTECTED_ROUTES.PROJECTS.DETAILS,
    element: createProtectedRoute({
      element: createLazyRoute('ProjectDetails')
    }, ['user', 'admin'])
  },
  {
    path: PROTECTED_ROUTES.SETTINGS.ROOT,
    element: createProtectedRoute({
      element: createLazyRoute('Settings')
    }, ['user', 'admin'])
  }
];

// Error route configurations
const errorRoutes: RouteObject[] = [
  {
    path: ERROR_ROUTES.NOT_FOUND,
    element: createLazyRoute('Error404')
  },
  {
    path: ERROR_ROUTES.SERVER_ERROR,
    element: createLazyRoute('Error500')
  },
  {
    path: ERROR_ROUTES.FORBIDDEN,
    element: createLazyRoute('Error403')
  }
];

// Complete route configuration with catch-all route
const routeConfig: RouteObject[] = [
  ...publicRoutes,
  ...protectedRoutes,
  ...errorRoutes,
  {
    path: '*',
    element: createLazyRoute('Error404')
  }
];

export default routeConfig;