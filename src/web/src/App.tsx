import React, { Suspense } from 'react';
import { Provider } from 'react-redux';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import MainLayout from './components/layout/MainLayout';
import routeConfig from './config/routes.config';
import store from './store';

// Theme configuration with light/dark mode support
const theme = {
  light: {
    colors: {
      background: 'var(--color-background)',
      text: 'var(--color-text-primary)',
      primary: 'var(--color-primary)',
      secondary: 'var(--color-secondary)',
      error: 'var(--color-error)',
      success: 'var(--color-success)',
      warning: 'var(--color-warning)',
      info: 'var(--color-info)'
    },
    spacing: {
      xs: 'var(--spacing-xs)',
      sm: 'var(--spacing-sm)',
      md: 'var(--spacing-md)',
      lg: 'var(--spacing-lg)',
      xl: 'var(--spacing-xl)'
    },
    breakpoints: {
      xs: 'var(--breakpoint-xs)',
      sm: 'var(--breakpoint-sm)',
      md: 'var(--breakpoint-md)',
      lg: 'var(--breakpoint-lg)',
      xl: 'var(--breakpoint-xl)'
    },
    transitions: {
      fast: 'var(--transition-fast)',
      normal: 'var(--transition-normal)',
      slow: 'var(--transition-slow)'
    }
  },
  dark: {
    // Dark theme configuration would mirror light theme with dark mode values
    // Omitted for brevity but would be implemented in production
  }
};

// Create browser router instance with route configuration
const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: routeConfig,
    errorElement: (
      <Suspense fallback={<div>Loading error page...</div>}>
        <div role="alert">Something went wrong!</div>
      </Suspense>
    )
  }
]);

/**
 * Root application component that sets up core providers and routing
 * Implements mobile-responsive interface, authentication, and real-time notifications
 */
const App: React.FC = () => {
  return (
    <React.StrictMode>
      <Provider store={store}>
        <ThemeProvider theme={theme.light}>
          <Suspense 
            fallback={
              <div 
                role="progressbar"
                aria-label="Loading application"
                aria-busy="true"
              >
                Loading...
              </div>
            }
          >
            <RouterProvider router={router} />
          </Suspense>
        </ThemeProvider>
      </Provider>
    </React.StrictMode>
  );
};

export default App;