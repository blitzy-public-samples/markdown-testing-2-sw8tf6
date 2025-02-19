// @fontsource/roboto v5.0.0 - Primary font family
import '@fontsource/roboto/300.css';  // Light
import '@fontsource/roboto/400.css';  // Regular
import '@fontsource/roboto/500.css';  // Medium
import '@fontsource/roboto/700.css';  // Bold

// @fontsource/open-sans v5.0.0 - Secondary font family
import '@fontsource/open-sans/300.css';  // Light
import '@fontsource/open-sans/400.css';  // Regular
import '@fontsource/open-sans/500.css';  // Medium
import '@fontsource/open-sans/700.css';  // Bold

/**
 * Standardized font weights used throughout the application.
 * Ensures consistent typography across all components.
 */
export enum FontWeights {
    light = 300,
    regular = 400,
    medium = 500,
    bold = 700
}

/**
 * Primary font family configuration (Roboto)
 * Optimized for modern browsers with appropriate system fallbacks
 */
export const primaryFont = {
    family: 'Roboto',
    weights: [
        FontWeights.light,
        FontWeights.regular,
        FontWeights.medium,
        FontWeights.bold
    ],
    fallback: [
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Helvetica',
        'Arial',
        'sans-serif'
    ]
} as const;

/**
 * Secondary font family configuration (Open Sans)
 * Provides alternative typography with consistent weight options
 */
export const secondaryFont = {
    family: 'Open Sans',
    weights: [
        FontWeights.light,
        FontWeights.regular,
        FontWeights.medium,
        FontWeights.bold
    ],
    fallback: [
        'system-ui',
        '-apple-system',
        'Segoe UI',
        'Helvetica Neue',
        'Arial',
        'sans-serif'
    ]
} as const;

/**
 * Helper function to generate font family string with fallbacks
 * @param fontConfig Font configuration object
 * @returns CSS font-family string
 */
export const getFontFamilyString = (
    fontConfig: typeof primaryFont | typeof secondaryFont
): string => {
    return `"${fontConfig.family}", ${fontConfig.fallback.join(', ')}`;
};

/**
 * Font loading optimization configuration
 * Ensures fonts are loaded efficiently with modern formats
 */
export const fontLoadingConfig = {
    formats: ['woff2', 'woff'],
    display: 'swap',
    unicodeRange: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
} as const;

/**
 * Responsive typography scale for different viewport sizes
 * Ensures proper font scaling across devices
 */
export const responsiveTypography = {
    minSize: {
        mobile: '14px',
        tablet: '16px',
        desktop: '16px'
    },
    maxSize: {
        mobile: '20px',
        tablet: '24px',
        desktop: '28px'
    },
    scaleRatio: 1.2
} as const;