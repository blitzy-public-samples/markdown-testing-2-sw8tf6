import React from 'react';
import styled from 'styled-components';
import Card from '../common/Card';

// Props interface with strict typing
export interface DashboardCardProps {
  title: string;
  value: string | number;
  description?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  className?: string;
}

// Styled components with theme-aware styling
const CardTitle = styled.h3`
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-tight);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

const CardValue = styled.div`
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: var(--spacing-sm) 0;
  line-height: var(--line-height-tight);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-normal);
`;

const CardDescription = styled.p`
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: var(--spacing-xs);
  line-height: var(--line-height-normal);
  overflow-wrap: break-word;
`;

const StyledCard = styled(Card)`
  min-width: var(--max-width-xs);
  max-width: var(--max-width-sm);
  height: fit-content;
  transition: transform var(--transition-normal);
  
  &:hover {
    transform: translateY(-2px);
  }

  @media (max-width: var(--breakpoint-sm)) {
    min-width: 100%;
  }
`;

// Memoized component for performance optimization
export const DashboardCard: React.FC<DashboardCardProps> = React.memo(({
  title,
  value,
  description,
  variant = 'default',
  className
}) => {
  // Format value based on type
  const formattedValue = React.useMemo(() => {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2
      }).format(value);
    }
    return value;
  }, [value]);

  // Generate unique IDs for accessibility
  const titleId = React.useId();
  const descriptionId = React.useId();

  return (
    <StyledCard
      variant={variant}
      className={className}
      padding="lg"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      role="region"
      testId={`dashboard-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardTitle id={titleId}>
        {title}
      </CardTitle>
      <CardValue>
        {formattedValue}
      </CardValue>
      {description && (
        <CardDescription id={descriptionId}>
          {description}
        </CardDescription>
      )}
    </StyledCard>
  );
});

// Display name for debugging
DashboardCard.displayName = 'DashboardCard';

// Default export
export default DashboardCard;