import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { ErrorBoundary } from 'react-error-boundary';
import { Header } from './Header';
import { Footer } from './Footer';
import { Sidebar } from '../common/Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';

// Layout container with responsive design
const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: var(--color-background);
  position: relative;
  overflow-x: hidden;

  @media (max-width: var(--breakpoint-md)) {
    flex-direction: column;
  }
`;

// Main content area with responsive margins
const MainContent = styled.main<{ sidebarCollapsed: boolean }>`
  flex: 1;
  padding: var(--spacing-md);
  margin-left: ${props => props.sidebarCollapsed ? '64px' : '240px'};
  transition: margin-left var(--transition-normal);
  position: relative;
  max-width: 100vw;

  @media (max-width: var(--breakpoint-md)) {
    margin-left: 0;
    margin-top: 64px;
  }
`;

// Error fallback component
const ErrorFallback = styled.div`
  padding: var(--spacing-lg);
  color: var(--color-error);
  text-align: center;
`;

export interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  showSidebar?: boolean;
  initialCollapsed?: boolean;
  onLayoutChange?: (state: LayoutState) => void;
}

export interface LayoutState {
  isSidebarCollapsed: boolean;
  isMobileView: boolean;
  contentWidth: string;
  layoutMode: 'default' | 'compact' | 'wide';
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  className,
  showSidebar = true,
  initialCollapsed = false,
  onLayoutChange
}) => {
  const { isAuthenticated, authState } = useAuth();
  const { isConnected, connectionState } = useWebSocket(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(initialCollapsed);
  const [isMobileView, setIsMobileView] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutState['layoutMode']>('default');

  // Handle window resize with debouncing
  const handleWindowResize = useCallback(() => {
    const isMobile = window.innerWidth <= 768;
    setIsMobileView(isMobile);
    
    if (isMobile && !isSidebarCollapsed) {
      setIsSidebarCollapsed(true);
    }

    onLayoutChange?.({
      isSidebarCollapsed,
      isMobileView: isMobile,
      contentWidth: `${window.innerWidth}px`,
      layoutMode
    });
  }, [isSidebarCollapsed, layoutMode, onLayoutChange]);

  // Handle sidebar toggle
  const handleSidebarToggle = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  // Handle touch swipe for mobile
  const handleTouchSwipe = useCallback((direction: 'left' | 'right') => {
    if (isMobileView) {
      setIsSidebarCollapsed(direction === 'left');
    }
  }, [isMobileView]);

  // Setup resize listener
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;
    
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleWindowResize, 250);
    };

    window.addEventListener('resize', debouncedResize);
    handleWindowResize(); // Initial check

    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimer);
    };
  }, [handleWindowResize]);

  // Error boundary handler
  const handleError = (error: Error) => {
    console.error('Layout Error:', error);
    // Implement error reporting service call here
  };

  return (
    <ErrorBoundary
      FallbackComponent={({ error }) => (
        <ErrorFallback role="alert">
          <h2>Something went wrong</h2>
          <pre>{error.message}</pre>
        </ErrorFallback>
      )}
      onError={handleError}
    >
      <LayoutContainer className={className}>
        <Header />
        
        {showSidebar && isAuthenticated && (
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onTouchSwipe={handleTouchSwipe}
          />
        )}

        <MainContent
          sidebarCollapsed={isSidebarCollapsed}
          role="main"
          aria-live="polite"
        >
          {/* Real-time connection status indicator */}
          {!isConnected && (
            <div
              role="status"
              aria-live="assertive"
              style={{
                position: 'fixed',
                top: '1rem',
                right: '1rem',
                padding: '0.5rem',
                backgroundColor: 'var(--color-error)',
                color: 'var(--color-white)',
                borderRadius: 'var(--border-radius-sm)',
                zIndex: 'var(--z-index-tooltip)'
              }}
            >
              Connection lost. Reconnecting...
            </div>
          )}

          {children}
        </MainContent>

        <Footer />
      </LayoutContainer>
    </ErrorBoundary>
  );
};

export default MainLayout;