import { memo } from 'react'; // react ^18.0.0

// Common interface for all icon components with accessibility support
export interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  ariaLabel?: string;
}

// Dashboard Menu Icon [#]
export const DashboardIcon = memo<IconProps>(({ 
  size = 24, 
  color = 'currentColor',
  className = '',
  ariaLabel = 'Dashboard'
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color}
    className={className}
    aria-label={ariaLabel}
    role="img"
  >
    <rect x="3" y="3" width="7" height="7" strokeWidth="2" />
    <rect x="14" y="3" width="7" height="7" strokeWidth="2" />
    <rect x="3" y="14" width="7" height="7" strokeWidth="2" />
    <rect x="14" y="14" width="7" height="7" strokeWidth="2" />
  </svg>
));

// Project Folder Icon
export const ProjectIcon = memo<IconProps>(({ 
  size = 24, 
  color = 'currentColor',
  className = '',
  ariaLabel = 'Project'
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color}
    className={className}
    aria-label={ariaLabel}
    role="img"
  >
    <path d="M3 7v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2h-6l-2-2H5c-1.1 0-2 .9-2 2z" strokeWidth="2" />
  </svg>
));

// Task List Icon [ ]
export const TaskIcon = memo<IconProps>(({ 
  size = 24, 
  color = 'currentColor',
  className = '',
  ariaLabel = 'Task'
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color}
    className={className}
    aria-label={ariaLabel}
    role="img"
  >
    <rect x="4" y="5" width="16" height="14" rx="2" strokeWidth="2" />
    <path d="M9 9h8" strokeWidth="2" />
    <path d="M9 13h8" strokeWidth="2" />
    <path d="M9 17h8" strokeWidth="2" />
  </svg>
));

// Add/Create New Icon [+]
export const AddIcon = memo<IconProps>(({ 
  size = 24, 
  color = 'currentColor',
  className = '',
  ariaLabel = 'Add'
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color}
    className={className}
    aria-label={ariaLabel}
    role="img"
  >
    <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" />
  </svg>
));

// Close/Delete Icon [x]
export const CloseIcon = memo<IconProps>(({ 
  size = 24, 
  color = 'currentColor',
  className = '',
  ariaLabel = 'Close'
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color}
    className={className}
    aria-label={ariaLabel}
    role="img"
  >
    <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
  </svg>
));

// User Profile Icon [@]
export const UserIcon = memo<IconProps>(({ 
  size = 24, 
  color = 'currentColor',
  className = '',
  ariaLabel = 'User'
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color}
    className={className}
    aria-label={ariaLabel}
    role="img"
  >
    <circle cx="12" cy="8" r="4" strokeWidth="2" />
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeWidth="2" />
  </svg>
));

// Settings Gear Icon [=]
export const SettingsIcon = memo<IconProps>(({ 
  size = 24, 
  color = 'currentColor',
  className = '',
  ariaLabel = 'Settings'
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color}
    className={className}
    aria-label={ariaLabel}
    role="img"
  >
    <circle cx="12" cy="12" r="3" strokeWidth="2" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" strokeWidth="2" />
  </svg>
));

// Alert/Warning Icon [!]
export const AlertIcon = memo<IconProps>(({ 
  size = 24, 
  color = 'currentColor',
  className = '',
  ariaLabel = 'Alert'
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color}
    className={className}
    aria-label={ariaLabel}
    role="img"
  >
    <path d="M12 9v4M12 17h.01" strokeWidth="2" strokeLinecap="round" />
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeWidth="2" />
  </svg>
));

// Help/Info Icon [?]
export const InfoIcon = memo<IconProps>(({ 
  size = 24, 
  color = 'currentColor',
  className = '',
  ariaLabel = 'Information'
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color}
    className={className}
    aria-label={ariaLabel}
    role="img"
  >
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
    <path d="M12 16v-4M12 8h.01" strokeWidth="2" strokeLinecap="round" />
  </svg>
));

// Upload Icon [^]
export const UploadIcon = memo<IconProps>(({ 
  size = 24, 
  color = 'currentColor',
  className = '',
  ariaLabel = 'Upload'
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color}
    className={className}
    aria-label={ariaLabel}
    role="img"
  >
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeWidth="2" strokeLinecap="round" />
  </svg>
));

// Star/Important Icon [*]
export const StarIcon = memo<IconProps>(({ 
  size = 24, 
  color = 'currentColor',
  className = '',
  ariaLabel = 'Important'
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color}
    className={className}
    aria-label={ariaLabel}
    role="img"
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeWidth="2" />
  </svg>
));