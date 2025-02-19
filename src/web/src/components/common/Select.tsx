import React, { useState, useRef, useCallback, useEffect } from 'react';
import classNames from 'classnames';
import { useVirtual } from 'react-virtual';
import '../../assets/styles/variables.css';

interface Option {
  value: string;
  label: string;
}

export interface SelectProps {
  options: Option[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  placeholder?: string;
  virtualScrollThreshold?: number;
  ariaLabel?: string;
  loadingMessage?: string;
  className?: string;
  error?: boolean;
  required?: boolean;
  name?: string;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  multiple = false,
  disabled = false,
  placeholder = 'Select an option',
  virtualScrollThreshold = 100,
  ariaLabel,
  loadingMessage = 'Loading options...',
  className,
  error = false,
  required = false,
  name,
}) => {
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [announcement, setAnnouncement] = useState('');

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute filtered options based on search
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Virtual scroll setup for large option lists
  const rowVirtualizer = useVirtual({
    size: filteredOptions.length,
    parentRef: listboxRef,
    estimateSize: useCallback(() => 40, []),
    overscan: 5,
    threshold: virtualScrollThreshold,
  });

  // Handle value display
  const getDisplayValue = () => {
    if (multiple && Array.isArray(value)) {
      return value.length > 0
        ? `${value.length} selected`
        : placeholder;
    }
    const selectedOption = options.find(opt => opt.value === value);
    return selectedOption ? selectedOption.label : placeholder;
  };

  // Keyboard navigation handler
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = focusedIndex + direction;
        if (nextIndex >= 0 && nextIndex < filteredOptions.length) {
          setFocusedIndex(nextIndex);
          announceOption(filteredOptions[nextIndex]);
        }
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (focusedIndex >= 0) {
          handleOptionSelect(filteredOptions[focusedIndex]);
        }
        break;
      }
      case 'Escape': {
        event.preventDefault();
        setIsOpen(false);
        containerRef.current?.focus();
        break;
      }
      case 'Tab': {
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
        }
        break;
      }
    }
  };

  // Option selection handler
  const handleOptionSelect = (option: Option) => {
    if (multiple && Array.isArray(value)) {
      const newValue = value.includes(option.value)
        ? value.filter(v => v !== option.value)
        : [...value, option.value];
      onChange(newValue);
      announceSelection(option, !value.includes(option.value));
    } else {
      onChange(option.value);
      announceSelection(option, true);
      setIsOpen(false);
    }
  };

  // Accessibility announcements
  const announceOption = (option: Option) => {
    setAnnouncement(`${option.label} ${
      multiple && Array.isArray(value) && value.includes(option.value)
        ? 'selected'
        : ''
    }`);
  };

  const announceSelection = (option: Option, isSelected: boolean) => {
    setAnnouncement(
      `${option.label} ${isSelected ? 'selected' : 'unselected'}`
    );
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Styles
  const containerStyles = classNames(
    'select-container',
    {
      'select-container--disabled': disabled,
      'select-container--error': error,
      'select-container--open': isOpen,
    },
    className
  );

  return (
    <div
      ref={containerRef}
      className={containerStyles}
      style={{
        position: 'relative',
        width: '100%',
      }}
    >
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="select-listbox"
        aria-label={ariaLabel || placeholder}
        aria-required={required}
        aria-invalid={error}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="select-trigger"
        style={{
          padding: 'var(--spacing-sm) var(--spacing-md)',
          border: `var(--border-width-thin) solid`,
          borderRadius: 'var(--border-radius-md)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'var(--transition-fast)',
        }}
      >
        <span className="select-value">{getDisplayValue()}</span>
      </div>

      {isOpen && (
        <ul
          id="select-listbox"
          ref={listboxRef}
          role="listbox"
          aria-multiselectable={multiple}
          className="select-options"
          style={{
            position: 'absolute',
            width: '100%',
            maxHeight: '300px',
            overflowY: 'auto',
            marginTop: 'var(--spacing-xs)',
            borderRadius: 'var(--border-radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 'var(--z-index-dropdown)',
          }}
        >
          {rowVirtualizer.virtualItems.map(virtualRow => {
            const option = filteredOptions[virtualRow.index];
            const isSelected = multiple
              ? Array.isArray(value) && value.includes(option.value)
              : value === option.value;

            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                data-index={virtualRow.index}
                style={{
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={classNames('select-option', {
                  'select-option--selected': isSelected,
                  'select-option--focused': focusedIndex === virtualRow.index,
                })}
                onClick={() => handleOptionSelect(option)}
              >
                {option.label}
              </li>
            );
          })}
        </ul>
      )}

      {/* Accessibility announcement region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </div>
  );
};