/**
 * @fileoverview Enhanced React hook for managing application theme with system preference detection,
 * persistence, and accessibility features. Implements WCAG 2.1 AA compliance.
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react'; // v18.x
import { themes, defaultTheme, storageKey, isValidTheme } from '../config/theme.config';
import useLocalStorage from './useLocalStorage';

/**
 * System preferences interface for theme and accessibility settings
 */
interface SystemPreferences {
  colorScheme: 'light' | 'dark';
  reducedMotion: boolean;
  highContrast: boolean;
}

/**
 * Theme hook return type with enhanced accessibility features
 */
interface ThemeState {
  theme: string;
  setTheme: (theme: string) => void;
  isDarkMode: boolean;
  isHighContrast: boolean;
  isReducedMotion: boolean;
}

/**
 * Detects system preferences for theme and accessibility
 * @returns SystemPreferences object containing detected preferences
 */
const getSystemPreferences = (): SystemPreferences => {
  if (typeof window === 'undefined') {
    return {
      colorScheme: 'light',
      reducedMotion: false,
      highContrast: false,
    };
  }

  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const highContrastQuery = window.matchMedia('(forced-colors: active)');

  return {
    colorScheme: darkModeQuery.matches ? 'dark' : 'light',
    reducedMotion: reducedMotionQuery.matches,
    highContrast: highContrastQuery.matches,
  };
};

/**
 * Enhanced hook for managing application theme with accessibility features
 * @returns ThemeState object containing theme state and controls
 */
const useTheme = (): ThemeState => {
  // Initialize theme with stored preference or system default
  const [storedTheme, setStoredTheme, storageStatus] = useLocalStorage<string>(
    storageKey,
    defaultTheme,
    {
      version: '1.0',
      syncTabs: true,
      retryAttempts: 3,
    }
  );

  // Track system preferences with memoization
  const systemPreferences = useMemo(() => getSystemPreferences(), []);
  const [preferences, setPreferences] = useState<SystemPreferences>(systemPreferences);

  // Validate and normalize theme value
  const normalizedTheme = useMemo(() => {
    return isValidTheme(storedTheme) ? storedTheme : defaultTheme;
  }, [storedTheme]);

  /**
   * Updates theme with validation and transition handling
   */
  const setTheme = useCallback((newTheme: string) => {
    if (!isValidTheme(newTheme)) {
      console.error(`Invalid theme: ${newTheme}`);
      return;
    }

    // Apply theme with transition
    const root = document.documentElement;
    const previousTheme = root.getAttribute('data-theme');

    if (previousTheme !== newTheme) {
      // Add transition class if motion is allowed
      if (!preferences.reducedMotion) {
        root.classList.add('theme-transition');
      }

      // Update theme
      root.setAttribute('data-theme', newTheme);
      root.classList.remove(previousTheme || '');
      root.classList.add(newTheme);

      // Remove transition class after animation
      if (!preferences.reducedMotion) {
        const cleanup = () => {
          root.classList.remove('theme-transition');
          root.removeEventListener('transitionend', cleanup);
        };
        root.addEventListener('transitionend', cleanup);
      }

      // Persist theme preference
      setStoredTheme(newTheme);
    }
  }, [preferences.reducedMotion, setStoredTheme]);

  // Setup system preference listeners
  useEffect(() => {
    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(forced-colors: active)');

    const updatePreferences = () => {
      setPreferences({
        colorScheme: colorSchemeQuery.matches ? 'dark' : 'light',
        reducedMotion: reducedMotionQuery.matches,
        highContrast: highContrastQuery.matches,
      });
    };

    // Add listeners with modern API
    colorSchemeQuery.addEventListener('change', updatePreferences);
    reducedMotionQuery.addEventListener('change', updatePreferences);
    highContrastQuery.addEventListener('change', updatePreferences);

    return () => {
      colorSchemeQuery.removeEventListener('change', updatePreferences);
      reducedMotionQuery.removeEventListener('change', updatePreferences);
      highContrastQuery.removeEventListener('change', updatePreferences);
    };
  }, []);

  // Apply theme on mount and preference changes
  useEffect(() => {
    if (!storageStatus.isLoading) {
      setTheme(normalizedTheme);
    }
  }, [normalizedTheme, setTheme, storageStatus.isLoading]);

  // Update meta theme-color
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const themeColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--background-primary')
        .trim();
      metaThemeColor.setAttribute('content', themeColor);
    }
  }, [normalizedTheme]);

  return {
    theme: normalizedTheme,
    setTheme,
    isDarkMode: preferences.colorScheme === 'dark',
    isHighContrast: preferences.highContrast,
    isReducedMotion: preferences.reducedMotion,
  };
};

export default useTheme;