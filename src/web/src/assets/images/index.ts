/**
 * Central barrel file for exporting all image assets used throughout the React application.
 * Provides a single point of access for importing images and ensures consistent image asset management.
 * @version 1.0.0
 */

/**
 * Type definition for image asset paths ensuring type safety across the application
 * All paths are relative to the assets directory
 */
export type ImageAsset = string;

/**
 * Default user avatar image path
 * Used in user profile displays, comment sections, and team member lists
 * @type {ImageAsset}
 */
export const defaultAvatar: ImageAsset = '/images/default-avatar.svg';

/**
 * Application logo image path
 * Used in navigation header, login page, and official communications
 * @type {ImageAsset}
 */
export const logo: ImageAsset = '/images/logo.svg';

/**
 * Empty state illustration
 * Used when no data is available in lists, tables, or search results
 * @type {ImageAsset}
 */
export const emptyState: ImageAsset = '/images/empty-state.svg';

/**
 * Error state illustration
 * Used in error pages, network errors, and general error feedback
 * @type {ImageAsset}
 */
export const errorState: ImageAsset = '/images/error-state.svg';

/**
 * Loading spinner animation
 * Used during data fetching, page transitions, and async operations
 * @type {ImageAsset}
 */
export const loadingSpinner: ImageAsset = '/images/loading-spinner.svg';

/**
 * @note All image paths are relative to the assets directory
 * @note Supports PNG, SVG, and WebP formats
 * @note Images should be optimized for web performance
 * @note Paths must be verified during build process
 * @note Consider implementing lazy loading for optimal performance
 * @note Maintain accessibility considerations for all images
 */