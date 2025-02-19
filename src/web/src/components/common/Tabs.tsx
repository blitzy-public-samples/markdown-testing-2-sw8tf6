import React, { useState, useCallback, useRef, useEffect } from 'react';
import classNames from 'classnames';
import { Button } from './Button';
import styles from './Tabs.module.css';

export interface TabsProps {
  /** Array of tab items with their content */
  tabs: Array<{
    label: string;
    content: React.ReactNode;
    disabled?: boolean;
    icon?: React.ReactNode;
  }>;
  /** Index of the default active tab (0-based) */
  defaultActiveTab?: number;
  /** Callback fired when active tab changes */
  onChange?: (index: number) => void;
  /** Orientation of the tabs */
  orientation?: 'horizontal' | 'vertical';
  /** Visual style variant */
  variant?: 'default' | 'contained' | 'pills';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS class */
  className?: string;
  /** Enable lazy loading of tab content */
  lazy?: boolean;
  /** Enable tab transition animations */
  animated?: boolean;
}

export const Tabs = React.memo(({
  tabs,
  defaultActiveTab = 0,
  onChange,
  orientation = 'horizontal',
  variant = 'default',
  size = 'md',
  className,
  lazy = false,
  animated = true,
}: TabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultActiveTab);
  const [focusedTab, setFocusedTab] = useState<number | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Validate active tab index
  useEffect(() => {
    if (activeTab >= tabs.length) {
      setActiveTab(0);
    }
  }, [tabs.length, activeTab]);

  // Handle tab change
  const handleTabChange = useCallback((index: number) => {
    if (index === activeTab || tabs[index]?.disabled) return;

    setActiveTab(index);
    onChange?.(index);
    setFocusedTab(index);
    tabRefs.current[index]?.focus();
  }, [activeTab, onChange, tabs]);

  // Keyboard navigation handler
  const handleKeyboardNavigation = useCallback((event: React.KeyboardEvent) => {
    const isHorizontal = orientation === 'horizontal';
    const tabCount = tabs.length;
    let nextIndex = activeTab;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        nextIndex = activeTab - 1;
        if (nextIndex < 0) nextIndex = tabCount - 1;
        while (nextIndex !== activeTab && tabs[nextIndex]?.disabled) {
          nextIndex = nextIndex - 1;
          if (nextIndex < 0) nextIndex = tabCount - 1;
        }
        break;

      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        nextIndex = activeTab + 1;
        if (nextIndex >= tabCount) nextIndex = 0;
        while (nextIndex !== activeTab && tabs[nextIndex]?.disabled) {
          nextIndex = nextIndex + 1;
          if (nextIndex >= tabCount) nextIndex = 0;
        }
        break;

      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        while (nextIndex < tabCount && tabs[nextIndex]?.disabled) {
          nextIndex++;
        }
        break;

      case 'End':
        event.preventDefault();
        nextIndex = tabCount - 1;
        while (nextIndex >= 0 && tabs[nextIndex]?.disabled) {
          nextIndex--;
        }
        break;

      default:
        return;
    }

    if (nextIndex !== activeTab && !tabs[nextIndex]?.disabled) {
      handleTabChange(nextIndex);
    }
  }, [activeTab, orientation, tabs, handleTabChange]);

  // Root class composition
  const rootClasses = classNames(
    styles.tabsRoot,
    styles[`tabs--${variant}`],
    styles[`tabs--${size}`],
    styles[`tabs--${orientation}`],
    {
      [styles['tabs--animated']]: animated,
    },
    className
  );

  return (
    <div className={rootClasses}>
      {/* Tab List */}
      <div
        ref={tabListRef}
        role="tablist"
        aria-orientation={orientation}
        className={styles.tabList}
        onKeyDown={handleKeyboardNavigation}
      >
        {tabs.map((tab, index) => {
          const isActive = index === activeTab;
          const isFocused = index === focusedTab;

          return orientation === 'horizontal' ? (
            <button
              key={index}
              ref={el => (tabRefs.current[index] = el)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tab-panel-${index}`}
              aria-disabled={tab.disabled}
              id={`tab-${index}`}
              tabIndex={isActive ? 0 : -1}
              className={classNames(styles.tab, {
                [styles.active]: isActive,
                [styles.focused]: isFocused,
                [styles.disabled]: tab.disabled,
              })}
              onClick={() => handleTabChange(index)}
              disabled={tab.disabled}
            >
              {tab.icon && (
                <span className={styles.tabIcon} aria-hidden="true">
                  {tab.icon}
                </span>
              )}
              <span className={styles.tabLabel}>{tab.label}</span>
            </button>
          ) : (
            <Button
              key={index}
              ref={el => (tabRefs.current[index] = el)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tab-panel-${index}`}
              aria-disabled={tab.disabled}
              id={`tab-${index}`}
              tabIndex={isActive ? 0 : -1}
              variant={isActive ? 'primary' : 'ghost'}
              size={size}
              fullWidth
              className={styles.verticalTab}
              onClick={() => handleTabChange(index)}
              isDisabled={tab.disabled}
              startIcon={tab.icon}
            >
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className={styles.tabPanels}>
        {tabs.map((tab, index) => (
          <div
            key={index}
            role="tabpanel"
            id={`tab-panel-${index}`}
            aria-labelledby={`tab-${index}`}
            hidden={index !== activeTab}
            className={classNames(styles.tabPanel, {
              [styles.active]: index === activeTab,
            })}
            tabIndex={0}
          >
            {(!lazy || index === activeTab) && tab.content}
          </div>
        ))}
      </div>
    </div>
  );
});

Tabs.displayName = 'Tabs';