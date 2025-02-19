import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import MainLayout from '../../components/layout/MainLayout';
import { Tabs } from '../../components/common/Tabs';
import Profile from './Profile';
import Security from './Security';
import { useAuth } from '../../hooks/useAuth';

/**
 * Settings page component providing a tabbed interface for user settings management
 * Implements profile and security configuration with responsive design
 */
const Settings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(0);

  // Initialize active tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const tabIndex = ['profile', 'security'].indexOf(tabParam);
      if (tabIndex !== -1) {
        setActiveTab(tabIndex);
      }
    }
  }, [searchParams]);

  // Handle tab changes with URL updates
  const handleTabChange = useCallback((tabIndex: number) => {
    setActiveTab(tabIndex);
    setSearchParams({ tab: tabIndex === 0 ? 'profile' : 'security' });
  }, [setSearchParams]);

  // Error fallback component
  const ErrorFallback = ({ error }: { error: Error }) => (
    <div className="error-container" role="alert">
      <h2>Settings Error</h2>
      <pre>{error.message}</pre>
      <button onClick={() => navigate(0)}>Retry</button>
    </div>
  );

  // Tab configuration
  const tabs = [
    {
      label: 'Profile',
      content: <Profile currentUser={user!} onProfileUpdate={() => {}} />,
      icon: '👤',
      disabled: false,
    },
    {
      label: 'Security',
      content: <Security />,
      icon: '🔒',
      disabled: false,
    }
  ];

  return (
    <MainLayout>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={(error) => {
          console.error('Settings Error:', error);
          // Implement error reporting service call here
        }}
      >
        <div className="settings-container">
          <header className="settings-header">
            <h1>Settings</h1>
            <p>Manage your account settings and preferences</p>
          </header>

          <Tabs
            tabs={tabs}
            defaultActiveTab={activeTab}
            onChange={handleTabChange}
            orientation="horizontal"
            variant="contained"
            size="md"
            lazy={true}
            animated={true}
            aria-label="Settings navigation"
          />
        </div>
      </ErrorBoundary>
    </MainLayout>
  );
};

export default Settings;