import React, { useMemo } from 'react'; // ^18.0.0
import styled from 'styled-components'; // ^6.0.0

// Types for component props
interface ProgressBarProps {
  value: number;
  color?: string;
  backgroundColor?: string;
  height?: string;
  width?: string;
  animated?: boolean;
  className?: string;
  label?: string;
}

// Styled container with accessibility attributes
const StyledProgressBarContainer = styled.div<{
  $width: string;
  $height: string;
  $backgroundColor: string;
}>`
  width: ${props => props.$width};
  height: ${props => props.$height};
  background-color: ${props => props.$backgroundColor};
  border-radius: var(--border-radius-full, 9999px);
  overflow: hidden;
  position: relative;
  
  /* Ensure hardware acceleration */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  
  /* Improve animation performance */
  will-change: transform;
`;

// Styled progress fill with animation support
const StyledProgressBarFill = styled.div<{
  $width: string;
  $color: string;
  $animated: boolean;
}>`
  width: ${props => props.$width};
  height: 100%;
  background-color: ${props => props.$color};
  border-radius: var(--border-radius-full, 9999px);
  transition: ${props => props.$animated ? 'width var(--transition-normal, 0.3s) ease-in-out' : 'none'};
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
`;

// Label container for screen readers
const ProgressLabel = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

// Memoized progress bar component
const ProgressBar: React.FC<ProgressBarProps> = React.memo(({
  value,
  color = 'var(--primary-color, #007bff)',
  backgroundColor = 'var(--background-secondary, #e9ecef)',
  height = '0.5rem',
  width = '100%',
  animated = true,
  className,
  label
}) => {
  // Clamp value between 0 and 100
  const clampedValue = useMemo(() => {
    return Math.min(Math.max(value, 0), 100);
  }, [value]);

  // Calculate width percentage
  const fillWidth = useMemo(() => {
    return `${clampedValue}%`;
  }, [clampedValue]);

  return (
    <StyledProgressBarContainer
      className={className}
      $width={width}
      $height={height}
      $backgroundColor={backgroundColor}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clampedValue}
      aria-label={label || 'Progress indicator'}
    >
      <StyledProgressBarFill
        $width={fillWidth}
        $color={color}
        $animated={animated}
      />
      {label && <ProgressLabel>{label}</ProgressLabel>}
    </StyledProgressBarContainer>
  );
});

// Display name for debugging
ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;

// Named exports for props type
export type { ProgressBarProps };