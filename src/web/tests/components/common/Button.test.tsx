import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@emotion/react';
import { Button, ButtonProps } from '../../../src/components/common/Button';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock SVG icon components for testing
const MockStartIcon = () => <svg data-testid="start-icon" />;
const MockEndIcon = () => <svg data-testid="end-icon" />;

// Helper function to render button with theme context
const renderButton = (props: Partial<ButtonProps> = {}, theme = {}) => {
  const defaultProps: ButtonProps = {
    children: 'Button Text',
    ...props
  };

  return render(
    <ThemeProvider theme={theme}>
      <Button {...defaultProps} />
    </ThemeProvider>
  );
};

describe('Button Component', () => {
  // Mock handlers
  const mockOnClick = jest.fn();
  const mockOnFocus = jest.fn();
  const mockOnBlur = jest.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('Rendering and Styling', () => {
    it('renders with default props', () => {
      renderButton();
      const button = screen.getByRole('button');
      
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('button', 'button--primary', 'button--md');
      expect(button).toHaveTextContent('Button Text');
    });

    it('renders all variant styles correctly', () => {
      const variants: Array<ButtonProps['variant']> = ['primary', 'secondary', 'outline', 'ghost'];
      
      variants.forEach(variant => {
        const { rerender } = renderButton({ variant });
        const button = screen.getByRole('button');
        expect(button).toHaveClass(`button--${variant}`);
        rerender(<Button variant={variant}>Button Text</Button>);
      });
    });

    it('renders all size variants correctly', () => {
      const sizes: Array<ButtonProps['size']> = ['sm', 'md', 'lg'];
      
      sizes.forEach(size => {
        const { rerender } = renderButton({ size });
        const button = screen.getByRole('button');
        expect(button).toHaveClass(`button--${size}`);
        rerender(<Button size={size}>Button Text</Button>);
      });
    });

    it('applies full width styling when fullWidth prop is true', () => {
      renderButton({ fullWidth: true });
      expect(screen.getByRole('button')).toHaveClass('button--full-width');
    });

    it('applies custom className when provided', () => {
      renderButton({ className: 'custom-class' });
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('Interaction Handling', () => {
    it('calls onClick handler when clicked', () => {
      renderButton({ onClick: mockOnClick });
      fireEvent.click(screen.getByRole('button'));
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('prevents click when disabled', () => {
      renderButton({ onClick: mockOnClick, isDisabled: true });
      fireEvent.click(screen.getByRole('button'));
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('prevents click when loading', () => {
      renderButton({ onClick: mockOnClick, isLoading: true });
      fireEvent.click(screen.getByRole('button'));
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('handles keyboard interactions correctly', () => {
      renderButton({ onClick: mockOnClick });
      const button = screen.getByRole('button');
      
      fireEvent.keyPress(button, { key: 'Enter', code: 'Enter' });
      fireEvent.keyPress(button, { key: ' ', code: 'Space' });
      
      expect(mockOnClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Loading State', () => {
    it('displays loading spinner when isLoading is true', () => {
      renderButton({ isLoading: true });
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByRole('button')).toContainElement(screen.getByRole('img', { hidden: true }));
    });

    it('hides content when loading', () => {
      renderButton({ isLoading: true });
      const content = screen.getByText('Button Text');
      expect(content.parentElement).toHaveStyle({ opacity: '0' });
    });
  });

  describe('Icon Support', () => {
    it('renders start icon correctly', () => {
      renderButton({ startIcon: <MockStartIcon /> });
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
    });

    it('renders end icon correctly', () => {
      renderButton({ endIcon: <MockEndIcon /> });
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    });

    it('renders both icons when provided', () => {
      renderButton({
        startIcon: <MockStartIcon />,
        endIcon: <MockEndIcon />
      });
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    });

    it('hides icons when loading', () => {
      renderButton({
        startIcon: <MockStartIcon />,
        endIcon: <MockEndIcon />,
        isLoading: true
      });
      expect(screen.queryByTestId('start-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('end-icon')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('meets accessibility standards', async () => {
      const { container } = renderButton();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports custom aria-label', () => {
      renderButton({ ariaLabel: 'Custom Button Label' });
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Custom Button Label');
    });

    it('indicates disabled state to screen readers', () => {
      renderButton({ isDisabled: true });
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('indicates loading state to screen readers', () => {
      renderButton({ isLoading: true });
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });

    it('maintains focus styles', () => {
      renderButton({ onFocus: mockOnFocus, onBlur: mockOnBlur });
      const button = screen.getByRole('button');
      
      fireEvent.focus(button);
      expect(mockOnFocus).toHaveBeenCalled();
      expect(button).toHaveFocus();
      
      fireEvent.blur(button);
      expect(mockOnBlur).toHaveBeenCalled();
      expect(button).not.toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('renders efficiently without unnecessary updates', async () => {
      const { rerender } = renderButton();
      const button = screen.getByRole('button');
      
      // Capture initial render state
      const initialHTML = button.innerHTML;
      
      // Rerender with same props
      rerender(<Button>Button Text</Button>);
      
      // Verify no unnecessary updates
      expect(button.innerHTML).toBe(initialHTML);
    });
  });
});