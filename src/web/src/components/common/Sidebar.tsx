import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom'; // ^6.14.0
import classNames from 'classnames'; // ^2.3.0
import useAuth from '../../hooks/useAuth';
import { PROTECTED_ROUTES } from '../../constants/routes.constants';
import styles from './Sidebar.module.css';

// Enhanced props interface with accessibility and animation controls
interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  animationDuration?: number;
  touchGestureEnabled?: boolean;
  accessibilityLabels?: {
    toggle: string;
    nav: string;
  };
}

// Enhanced interface for navigation items with security features
interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  children?: NavItem[];
  requiredRoles?: string[];
  analyticsId: string;
  touchTarget?: {
    width: number;
    height: number;
  };
}

/**
 * Enhanced Sidebar component with security, accessibility, and performance optimizations
 */
const Sidebar: React.FC<SidebarProps> = ({
  className,
  isCollapsed: initialCollapsed = false,
  animationDuration = 300,
  touchGestureEnabled = true,
  accessibilityLabels = {
    toggle: 'Toggle navigation menu',
    nav: 'Main navigation'
  }
}) => {
  // Enhanced authentication state with MFA and email verification
  const { user, isAuthenticated, isMfaVerified, isEmailVerified } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  // Enhanced navigation items with role-based access control
  const navigationItems: NavItem[] = [
    {
      path: PROTECTED_ROUTES.DASHBOARD,
      label: 'Dashboard',
      icon: '📊',
      analyticsId: 'nav_dashboard',
      touchTarget: { width: 44, height: 44 }
    },
    {
      path: PROTECTED_ROUTES.TASKS.ROOT,
      label: 'Tasks',
      icon: '✓',
      analyticsId: 'nav_tasks',
      children: [
        {
          path: PROTECTED_ROUTES.TASKS.LIST,
          label: 'All Tasks',
          icon: '📋',
          analyticsId: 'nav_tasks_list'
        },
        {
          path: PROTECTED_ROUTES.TASKS.CREATE,
          label: 'Create Task',
          icon: '➕',
          analyticsId: 'nav_tasks_create'
        }
      ]
    },
    {
      path: PROTECTED_ROUTES.PROJECTS.ROOT,
      label: 'Projects',
      icon: '📁',
      analyticsId: 'nav_projects',
      requiredRoles: ['ADMIN', 'MANAGER']
    },
    {
      path: PROTECTED_ROUTES.SETTINGS.ROOT,
      label: 'Settings',
      icon: '⚙️',
      analyticsId: 'nav_settings'
    }
  ];

  // Enhanced route matching with security context
  const isActiveRoute = useCallback((path: string): boolean => {
    return location.pathname.startsWith(path);
  }, [location]);

  // Enhanced touch gesture handling with security validation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!touchGestureEnabled) return;
    setTouchStart(e.touches[0].clientX);
  }, [touchGestureEnabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchGestureEnabled || touchStart === null) return;

    const touchDelta = e.touches[0].clientX - touchStart;
    if (Math.abs(touchDelta) > 50) {
      setIsCollapsed(touchDelta < 0);
      setTouchStart(null);
    }
  }, [touchGestureEnabled, touchStart]);

  // Enhanced keyboard navigation
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsCollapsed(true);
    }
  }, []);

  // Setup keyboard listeners with cleanup
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Enhanced security validation for navigation items
  const canAccessRoute = useCallback((item: NavItem): boolean => {
    if (!isAuthenticated || !isMfaVerified || !isEmailVerified) return false;
    if (!item.requiredRoles) return true;
    return item.requiredRoles.includes(user?.role || '');
  }, [isAuthenticated, isMfaVerified, isEmailVerified, user]);

  // Enhanced recursive navigation rendering with security checks
  const renderNavItems = useCallback((items: NavItem[]): React.ReactNode => {
    return items.map((item) => {
      if (!canAccessRoute(item)) return null;

      const isActive = isActiveRoute(item.path);
      const hasChildren = item.children && item.children.length > 0;

      return (
        <li key={item.path} className={styles.navItem}>
          <Link
            to={item.path}
            className={classNames(styles.navLink, {
              [styles.active]: isActive,
              [styles.hasChildren]: hasChildren
            })}
            data-analytics-id={item.analyticsId}
            style={item.touchTarget ? {
              minWidth: item.touchTarget.width,
              minHeight: item.touchTarget.height
            } : undefined}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={styles.icon} aria-hidden="true">{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </Link>
          {hasChildren && (
            <ul className={styles.subNav}>
              {renderNavItems(item.children!)}
            </ul>
          )}
        </li>
      );
    });
  }, [canAccessRoute, isActiveRoute]);

  return (
    <nav
      ref={sidebarRef}
      className={classNames(
        styles.sidebar,
        { [styles.collapsed]: isCollapsed },
        className
      )}
      aria-label={accessibilityLabels.nav}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      style={{ transition: `width ${animationDuration}ms ease-in-out` }}
    >
      <div className={styles.header}>
        <button
          className={styles.toggleButton}
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={accessibilityLabels.toggle}
          aria-expanded={!isCollapsed}
        >
          <span className={styles.toggleIcon} aria-hidden="true">
            {isCollapsed ? '▶' : '◀'}
          </span>
        </button>
      </div>

      {isAuthenticated && (
        <ul className={styles.navList}>
          {renderNavItems(navigationItems)}
        </ul>
      )}

      <div className={styles.footer}>
        {user && (
          <div className={styles.userInfo}>
            <img
              src={user.avatar || '/default-avatar.png'}
              alt={`${user.name}'s avatar`}
              className={styles.avatar}
            />
            {!isCollapsed && (
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userRole}>{user.role}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Sidebar;