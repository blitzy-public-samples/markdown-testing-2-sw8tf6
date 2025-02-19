import React, { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames'; // ^2.3.0
import styles from './Dropdown.module.css';

// Types
export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  isMulti?: boolean;
  isSearchable?: boolean;
  isDisabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'aria-label'?: string;
}

interface VirtualScrollState {
  startIndex: number;
  endIndex: number;
  visibleCount: number;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  isMulti = false,
  isSearchable = false,
  isDisabled = false,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}) => {
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [virtualScroll, setVirtualScroll] = useState<VirtualScrollState>({
    startIndex: 0,
    endIndex: 20,
    visibleCount: 20,
  });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Derived state
  const selectedValues = Array.isArray(value) ? value : [value];
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Handle click outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
      setSearchValue('');
    }
  }, []);

  // Setup click outside listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleClickOutside]);

  // Virtual scroll calculation
  useEffect(() => {
    if (optionsRef.current && isOpen) {
      const optionHeight = 40; // height of each option in pixels
      const viewportHeight = optionsRef.current.clientHeight;
      const visibleCount = Math.ceil(viewportHeight / optionHeight);
      
      setVirtualScroll(prev => ({
        ...prev,
        visibleCount,
        endIndex: Math.min(prev.startIndex + visibleCount, filteredOptions.length),
      }));
    }
  }, [isOpen, filteredOptions.length]);

  // Keyboard navigation handler
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isDisabled) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          handleOptionSelect(filteredOptions[focusedIndex]);
        } else {
          setIsOpen(true);
        }
        break;

      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setSearchValue('');
        break;

      case 'Tab':
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
          setSearchValue('');
        }
        break;

      default:
        if (isSearchable && /^[a-zA-Z0-9]$/.test(event.key)) {
          if (!isOpen) setIsOpen(true);
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }
        break;
    }
  };

  // Option selection handler
  const handleOptionSelect = (option: DropdownOption) => {
    if (isMulti) {
      const newValue = selectedValues.includes(option.value)
        ? selectedValues.filter(v => v !== option.value)
        : [...selectedValues, option.value];
      onChange(newValue);
    } else {
      onChange(option.value);
      setIsOpen(false);
      setSearchValue('');
    }
  };

  // Render selected value(s)
  const renderValue = () => {
    if (selectedValues.length === 0) return placeholder;
    
    const selectedLabels = options
      .filter(option => selectedValues.includes(option.value))
      .map(option => option.label);

    return isMulti
      ? selectedLabels.join(', ')
      : selectedLabels[0];
  };

  return (
    <div
      ref={containerRef}
      className={classNames(
        styles.container,
        styles[`size-${size}`],
        {
          [styles.disabled]: isDisabled,
          [styles.open]: isOpen,
        },
        className
      )}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dropdownRef}
        className={styles.control}
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={isDisabled}
        aria-label={ariaLabel}
        tabIndex={isDisabled ? -1 : 0}
      >
        <div className={styles.value}>{renderValue()}</div>
        <div className={styles.indicators}>
          {isSearchable && isOpen && (
            <input
              ref={searchInputRef}
              className={styles.search}
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="Search..."
              aria-label="Search options"
            />
          )}
          <div className={styles.arrow} aria-hidden="true" />
        </div>
      </div>

      {isOpen && (
        <div
          ref={optionsRef}
          className={styles.menu}
          role="listbox"
          aria-multiselectable={isMulti}
        >
          {filteredOptions.length === 0 ? (
            <div className={styles.noOptions}>No options available</div>
          ) : (
            filteredOptions
              .slice(virtualScroll.startIndex, virtualScroll.endIndex)
              .map((option, index) => {
                const isSelected = selectedValues.includes(option.value);
                const isFocused = index + virtualScroll.startIndex === focusedIndex;

                return (
                  <div
                    key={option.value}
                    className={classNames(styles.option, {
                      [styles.selected]: isSelected,
                      [styles.focused]: isFocused,
                    })}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleOptionSelect(option)}
                    style={{
                      transform: `translateY(${(index + virtualScroll.startIndex) * 40}px)`,
                    }}
                  >
                    {isMulti && (
                      <div className={styles.checkbox} aria-hidden="true">
                        {isSelected && <span className={styles.checkmark}>✓</span>}
                      </div>
                    )}
                    {option.label}
                  </div>
                );
              })
          )}
        </div>
      )}
    </div>
  );
};

export default Dropdown;