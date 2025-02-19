import React, { useEffect, useState } from 'react';
import '../../assets/styles/variables.css';

// Props interface with comprehensive configuration options
interface LoadingProps {
  /** Size variant of the loading spinner */
  size?: 'small' | 'medium' | 'large';
  /** Color theme of the spinner */
  color?: 'primary' | 'secondary' | 'white';
  /** Whether to show spinner with overlay background */
  overlay?: boolean;
  /** Optional loading text for better context */
  text?: string;
  /** Test identifier for automated testing */
  testId?: string;
}

// Custom hook to detect reduced motion preference
const useReducedMotion = (): boolean => {
  const [prefersReduced, setPrefersReduced] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReduced(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReduced;
};

// Size mappings for the spinner
const sizeMap = {
  small: '1.5rem',
  medium: '2.5rem',
  large: '3.5rem',
};

// Color mappings using CSS variables
const colorMap = {
  primary: 'var(--primary-color)',
  secondary: '#6B7280',
  white: '#FFFFFF',
};

export const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  color = 'primary',
  overlay = false,
  text,
  testId = 'loading-spinner',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const spinnerSize = sizeMap[size];
  const spinnerColor = colorMap[color];

  // Base spinner styles with performance optimizations
  const spinnerStyle: React.CSSProperties = {
    width: spinnerSize,
    height: spinnerSize,
    border: `var(--border-width-medium) solid rgba(0, 0, 0, 0.1)`,
    borderTopColor: spinnerColor,
    borderRadius: 'var(--border-radius-full)',
    animation: prefersReducedMotion 
      ? 'none' 
      : `spin var(--transition-normal) linear infinite`,
    transform: 'translateZ(0)', // Force GPU acceleration
    willChange: 'transform',
    backfaceVisibility: 'hidden',
  };

  // Overlay container styles
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 'var(--z-index-modal)',
  };

  // Container styles for non-overlay mode
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
  };

  // Define keyframes for spinner animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const content = (
    <div style={containerStyle}>
      <div
        style={spinnerStyle}
        role="progressbar"
        aria-label={text || 'Loading content'}
        aria-busy="true"
        data-testid={testId}
      />
      {text && (
        <span
          style={{
            color: color === 'white' ? '#FFFFFF' : 'inherit',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          {text}
        </span>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div 
        style={overlayStyle}
        role="dialog"
        aria-modal="true"
        aria-label="Loading overlay"
      >
        {content}
      </div>
    );
  }

  return content;
};

// Default export for convenient importing
export default Loading;