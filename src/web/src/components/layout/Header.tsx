import React, { memo, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { NotificationBadge } from '../notifications/NotificationBadge';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';

/**
 * Styled header container with responsive design
 */
const StyledHeader = styled.header`
  position: fixed;
  top: 0;
  width: 100%;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  background-color: var(--color-background);
  box-shadow: var(--shadow-sm);
  z-index: var(--z-index-fixed);
  transition: transform var(--transition-normal);

  @media (max-width: var(--breakpoint-sm)) {
    padding: 0 var(--spacing-md);
    height: 56px;
  }

  @media (max-width: var(--breakpoint-xs)) {
    padding: 0 var(--spacing-sm);
  }
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
`;

const NavContainer = styled.nav`
  display: flex;
  align-items: center;
  gap: var(--spacing-md);

  @media (max-width: var(--breakpoint-sm)) {
    gap: var(--spacing-sm);
  }
`;

const UserContainer = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
`;

/**
 * Header component providing navigation, authentication status, and notifications
 * Implements responsive design and security features
 */
export const Header = memo(() => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, mfaStatus } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll events for header visibility
  useEffect(() => {
    let lastScroll = 0;
    const handleScroll = () => {
      const currentScroll = window.pageYOffset;
      setIsScrolled(currentScroll > lastScroll && currentScroll > 64);
      lastScroll = currentScroll;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Secure logout handler with cleanup
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout, navigate]);

  // Notification click handler with WebSocket support
  const handleNotificationClick = useCallback(() => {
    navigate('/notifications');
  }, [navigate]);

  return (
    <StyledHeader
      style={{ transform: isScrolled ? 'translateY(-100%)' : 'translateY(0)' }}
      role="banner"
      aria-label="Main header"
    >
      <LogoContainer>
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          aria-label="Go to dashboard"
        >
          Task Manager
        </Button>
      </LogoContainer>

      {isAuthenticated && (
        <NavContainer role="navigation">
          <Button
            variant="ghost"
            onClick={() => navigate('/projects')}
            aria-label="View projects"
          >
            Projects
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/tasks')}
            aria-label="View tasks"
          >
            Tasks
          </Button>
        </NavContainer>
      )}

      <UserContainer>
        {isAuthenticated ? (
          <>
            <NotificationBadge
              onBadgeClick={handleNotificationClick}
              size="medium"
              theme="light"
            />
            
            {mfaStatus === 'enabled' && (
              <Button
                variant="ghost"
                size="sm"
                aria-label="MFA enabled"
                startIcon={<span aria-hidden="true">🔒</span>}
              />
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              aria-label={`View profile for ${user?.name}`}
            >
              {user?.name}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              aria-label="Logout"
            >
              Logout
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/login')}
              aria-label="Login"
            >
              Login
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/register')}
              aria-label="Register"
            >
              Register
            </Button>
          </>
        )}
      </UserContainer>
    </StyledHeader>
  );
});

Header.displayName = 'Header';