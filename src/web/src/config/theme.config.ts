import { darkTheme } from '../assets/styles/themes/dark.css';
import { lightTheme } from '../assets/styles/themes/light.css';

/**
 * Theme Configuration Interface
 * Defines the structure for theme objects with strict typing
 */
interface ThemeConfig {
  name: string;
  label: string;
  stylesheet: string;
  systemPreference: 'light' | 'dark';
  accessibility: {
    contrastRatio: string;
    wcagLevel: 'A' | 'AA' | 'AAA';
    reducedMotion: boolean;
  };
}

/**
 * Theme Configuration Type
 * Defines the structure for the complete theme configuration
 */
interface ThemeConfiguration {
  themes: Record<string, ThemeConfig>;
  defaultTheme: string;
  storageKey: string;
  transitionDuration: string;
  performance: {
    stylesheetLoading: 'dynamic' | 'static';
    transitionOptimization: string;
    cacheStrategy: 'localStorage' | 'sessionStorage';
  };
}

// Storage key for theme preference persistence
const STORAGE_KEY = 'app-theme-preference';

/**
 * Theme Configuration Object
 * Comprehensive configuration for the application's theming system
 */
export const themeConfig: ThemeConfiguration = {
  themes: {
    light: {
      name: 'light',
      label: 'Light Mode',
      stylesheet: lightTheme,
      systemPreference: 'light',
      accessibility: {
        contrastRatio: '4.5:1',
        wcagLevel: 'AA',
        reducedMotion: true,
      },
    },
    dark: {
      name: 'dark',
      label: 'Dark Mode',
      stylesheet: darkTheme,
      systemPreference: 'dark',
      accessibility: {
        contrastRatio: '4.5:1',
        wcagLevel: 'AA',
        reducedMotion: true,
      },
    },
  },
  defaultTheme: 'light',
  storageKey: STORAGE_KEY,
  transitionDuration: '250ms',
  performance: {
    stylesheetLoading: 'dynamic',
    transitionOptimization: 'transform',
    cacheStrategy: 'localStorage',
  },
};

/**
 * Type-safe validation of theme names
 * @param themeName - The theme name to validate
 * @returns boolean indicating if the theme is valid
 */
export const isValidTheme = (themeName: string): themeName is keyof typeof themeConfig.themes => {
  if (!themeName || typeof themeName !== 'string') {
    return false;
  }

  return Object.prototype.hasOwnProperty.call(themeConfig.themes, themeName) &&
    Boolean(themeConfig.themes[themeName as keyof typeof themeConfig.themes]);
};

/**
 * Detects system color scheme preference
 * @returns The preferred theme based on system settings
 */
export const detectSystemPreference = (): 'light' | 'dark' => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return themeConfig.defaultTheme as 'light' | 'dark';
  }

  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  return darkModeQuery.matches ? 'dark' : 'light';
};

/**
 * Theme Transition Helper
 * Manages smooth transitions between themes while optimizing performance
 */
const themeTransition = {
  duration: parseInt(themeConfig.transitionDuration, 10),
  properties: [
    'background-color',
    'color',
    'border-color',
    'box-shadow',
  ].join(','),
};

/**
 * Performance Optimization Configuration
 * Settings for optimizing theme-related performance
 */
const performanceConfig = {
  // Stylesheet loading optimization
  stylesheetLoadingStrategy: {
    preload: true,
    prefetch: true,
    crossOrigin: 'anonymous',
  },
  // Hardware acceleration settings
  hardwareAcceleration: {
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
  },
  // Cache configuration
  cacheConfig: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    staleWhileRevalidate: true,
  },
};

// Export configuration objects
export {
  themeTransition,
  performanceConfig,
};

// Type exports for consuming components
export type ThemeMode = keyof typeof themeConfig.themes;
export type ThemePreference = ThemeMode | 'system';