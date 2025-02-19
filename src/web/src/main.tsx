import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store';
import { PerformanceMonitor } from '@performance-monitor/core';

// Browser compatibility check based on technical requirements
const REQUIRED_BROWSER_VERSIONS = {
  chrome: 90,
  firefox: 88,
  safari: 14,
  edge: 90
};

/**
 * Checks if the current browser meets minimum version requirements
 * @returns {boolean} Whether browser is compatible
 */
const checkBrowserCompatibility = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  
  // Extract browser and version
  const browser = 
    ua.includes('chrome') ? 'chrome' :
    ua.includes('firefox') ? 'firefox' :
    ua.includes('safari') && !ua.includes('chrome') ? 'safari' :
    ua.includes('edg') ? 'edge' : null;

  if (!browser) return false;

  const version = parseInt(
    ua.match(
      browser === 'safari' ? /version\/(\d+)/ :
      new RegExp(`${browser}\\/([\\d]+)`)
    )?.[1] || '0'
  );

  return version >= REQUIRED_BROWSER_VERSIONS[browser as keyof typeof REQUIRED_BROWSER_VERSIONS];
};

/**
 * Initializes performance monitoring and sets up error tracking
 */
const initializeApp = async (): Promise<void> => {
  // Initialize performance monitoring
  const performanceMonitor = new PerformanceMonitor({
    sampleRate: 0.1, // Sample 10% of users
    maxEntries: 100,
    reportingEndpoint: '/api/performance',
    tracingEnabled: process.env.NODE_ENV === 'development'
  });

  // Set up performance marks for key metrics
  performance.mark('app-init-start');

  // Set security headers
  if (process.env.NODE_ENV === 'production') {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';";
    document.head.appendChild(meta);
  }

  // Initialize error tracking
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('Global error:', {
      message,
      source,
      lineno,
      colno,
      error,
      timestamp: new Date().toISOString()
    });
    return false;
  };

  // Track performance metrics
  performanceMonitor.startTracking();
};

/**
 * Renders the React application with all required providers
 */
const renderApp = (): void => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found. Ensure there is a <div id="root"> in your HTML.');
  }

  // Check browser compatibility
  if (!checkBrowserCompatibility()) {
    rootElement.innerHTML = `
      <div role="alert" style="padding: 20px; text-align: center;">
        <h1>Browser Update Required</h1>
        <p>Your browser version is not supported. Please update to a modern browser:</p>
        <ul style="list-style: none; padding: 0;">
          <li>Chrome ${REQUIRED_BROWSER_VERSIONS.chrome}+</li>
          <li>Firefox ${REQUIRED_BROWSER_VERSIONS.firefox}+</li>
          <li>Safari ${REQUIRED_BROWSER_VERSIONS.safari}+</li>
          <li>Edge ${REQUIRED_BROWSER_VERSIONS.edge}+</li>
        </ul>
      </div>
    `;
    return;
  }

  const root = createRoot(rootElement);

  // Wrap app with strict mode in development
  const app = process.env.NODE_ENV === 'development' ? (
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  ) : (
    <Provider store={store}>
      <App />
    </Provider>
  );

  // Render the application
  root.render(app);

  // Mark render completion
  performance.mark('app-init-end');
  performance.measure('app-initialization', 'app-init-start', 'app-init-end');
};

// Initialize and render the application
initializeApp()
  .then(renderApp)
  .catch((error) => {
    console.error('Application initialization failed:', error);
    
    // Show user-friendly error message
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div role="alert" style="padding: 20px; text-align: center;">
          <h1>Application Error</h1>
          <p>Sorry, we encountered an error while starting the application. Please try refreshing the page.</p>
        </div>
      `;
    }
  });