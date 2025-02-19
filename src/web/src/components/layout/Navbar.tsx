import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import { Button } from '../common/Button';
import { Dropdown } from '../common/Dropdown';
import { NotificationBadge } from '../notifications/NotificationBadge';
import { useAuth } from '../../hooks/useAuth';
import styles from './Navbar.module.css';

interface NavbarProps {
  /** Optional additional CSS classes */
  className?: string;
  /** Theme variant */
  theme?: 'light' | 'dark';
}

/**
 * Main navigation bar component with authentication and notification support
 * Implements responsive design and real-time updates
 */
export const Navbar: React.FC<NavbarProps> = ({
  className,
  theme = 'light'
}) => {
  // Hooks
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  
  // State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  
  // Refs
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const notificationPanelRef = useRef<HTMLDivElement>(null);

  // Handle secure logout with cleanup
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setIsMobileMenuOpen(false);
      setIsNotificationPanelOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout, navigate]);

  // Handle notification panel toggle
  const handleNotificationClick = useCallback(() => {
    setIsNotificationPanelOpen(prev => !prev);
    setIsMobileMenuOpen(false);
  }, []);

  // Handle mobile menu toggle
  const handleMobileMenuToggle = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
    setIsNotificationPanelOpen(false);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
      if (
        notificationPanelRef.current &&
        !notificationPanelRef.current.contains(event.target as Node)
      ) {
        setIsNotificationPanelOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigation items based on authentication state
  const navigationItems = isAuthenticated ? [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Projects', path: '/projects' },
    { label: 'Tasks', path: '/tasks' },
    { label: 'Reports', path: '/reports' }
  ] : [
    { label: 'Home', path: '/' },
    { label: 'Features', path: '/features' },
    { label: 'Pricing', path: '/pricing' }
  ];

  return (
    <nav
      className={classNames(
        styles.navbar,
        styles[`navbar--${theme}`],
        className
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo and brand */}
      <div className={styles.brand}>
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className={styles.logoButton}
          aria-label="Go to homepage"
        >
          <img
            src="/logo.svg"
            alt="Task Manager Logo"
            className={styles.logo}
          />
        </Button>
      </div>

      {/* Mobile menu button */}
      <Button
        variant="ghost"
        className={styles.mobileMenuButton}
        onClick={handleMobileMenuToggle}
        aria-expanded={isMobileMenuOpen}
        aria-controls="mobile-menu"
        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
      >
        <span className={styles.hamburger} aria-hidden="true" />
      </Button>

      {/* Main navigation */}
      <div
        className={classNames(styles.navigation, {
          [styles['navigation--open']]: isMobileMenuOpen
        })}
        ref={mobileMenuRef}
        id="mobile-menu"
      >
        <ul className={styles.navList}>
          {navigationItems.map(item => (
            <li key={item.path} className={styles.navItem}>
              <Button
                variant="ghost"
                onClick={() => {
                  navigate(item.path);
                  setIsMobileMenuOpen(false);
                }}
                className={styles.navLink}
              >
                {item.label}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {/* Auth and notifications section */}
      <div className={styles.actions}>
        {isAuthenticated ? (
          <>
            {/* Notifications */}
            <NotificationBadge
              onBadgeClick={handleNotificationClick}
              size="medium"
              theme={theme}
              className={styles.notificationBadge}
            />

            {/* User menu */}
            <Dropdown
              options={[
                { value: 'profile', label: 'Profile' },
                { value: 'settings', label: 'Settings' },
                { value: 'logout', label: 'Logout' }
              ]}
              value=""
              onChange={(value) => {
                if (value === 'logout') {
                  handleLogout();
                } else {
                  navigate(`/${value}`);
                }
              }}
              className={styles.userMenu}
              aria-label="User menu"
            >
              <div className={styles.userAvatar}>
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.name}'s avatar`}
                    className={styles.avatarImage}
                  />
                ) : (
                  <span className={styles.avatarFallback}>
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
            </Dropdown>
          </>
        ) : (
          <div className={styles.authButtons}>
            <Button
              variant="ghost"
              onClick={() => navigate('/login')}
              className={styles.loginButton}
            >
              Log in
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/register')}
              className={styles.registerButton}
            >
              Sign up
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

// CSS Module styles
const styles = {
  navbar: `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--navbar-height, 64px);
    padding: 0 var(--spacing-lg);
    background-color: var(--color-background);
    border-bottom: var(--border-width-thin) solid var(--color-border);
    z-index: var(--z-index-navbar);
  `,

  'navbar--light': `
    --navbar-bg: var(--color-white);
    --navbar-text: var(--color-text-primary);
    --navbar-border: var(--color-border);
  `,

  'navbar--dark': `
    --navbar-bg: var(--color-gray-900);
    --navbar-text: var(--color-white);
    --navbar-border: var(--color-gray-800);
  `,

  brand: `
    display: flex;
    align-items: center;
  `,

  logoButton: `
    padding: var(--spacing-sm);
  `,

  logo: `
    height: 32px;
    width: auto;
  `,

  navigation: `
    display: flex;
    align-items: center;
    margin: 0 auto;

    @media (max-width: 768px) {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background-color: var(--navbar-bg);
      border-bottom: var(--border-width-thin) solid var(--navbar-border);
      padding: var(--spacing-md);
    }
  `,

  'navigation--open': `
    display: block;
  `,

  navList: `
    display: flex;
    gap: var(--spacing-md);
    list-style: none;
    margin: 0;
    padding: 0;

    @media (max-width: 768px) {
      flex-direction: column;
    }
  `,

  navItem: `
    display: flex;
  `,

  navLink: `
    color: var(--navbar-text);
    text-decoration: none;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius-md);
    transition: background-color var(--transition-normal);

    &:hover {
      background-color: var(--color-background-hover);
    }
  `,

  actions: `
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  `,

  mobileMenuButton: `
    display: none;
    padding: var(--spacing-sm);

    @media (max-width: 768px) {
      display: flex;
    }
  `,

  hamburger: `
    width: 24px;
    height: 2px;
    background-color: var(--navbar-text);
    position: relative;

    &::before,
    &::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      background-color: var(--navbar-text);
      transition: transform var(--transition-normal);
    }

    &::before {
      transform: translateY(-6px);
    }

    &::after {
      transform: translateY(6px);
    }
  `,

  userMenu: `
    position: relative;
  `,

  userAvatar: `
    width: 32px;
    height: 32px;
    border-radius: var(--border-radius-full);
    overflow: hidden;
    background-color: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
  `,

  avatarImage: `
    width: 100%;
    height: 100%;
    object-fit: cover;
  `,

  avatarFallback: `
    color: var(--color-white);
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-md);
  `,

  authButtons: `
    display: flex;
    gap: var(--spacing-sm);
  `,

  notificationBadge: `
    margin-right: var(--spacing-sm);
  `
} as const;