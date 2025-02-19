// @testing-library/jest-dom v6.1.0
import '@testing-library/jest-dom';

// Configure React environment for testing
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mock window.matchMedia for responsive design testing
const mockMatchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(), // Deprecated but kept for legacy support
  removeListener: jest.fn(), // Deprecated but kept for legacy support
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

// Mock ResizeObserver for component size monitoring
class MockResizeObserver {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe = jest.fn((target: Element) => {
    // Simulate initial size observation
    const entry: ResizeObserverEntry = {
      target,
      contentRect: target.getBoundingClientRect(),
      borderBoxSize: [{ blockSize: 0, inlineSize: 0 }],
      contentBoxSize: [{ blockSize: 0, inlineSize: 0 }],
      devicePixelContentBoxSize: [{ blockSize: 0, inlineSize: 0 }],
    };
    this.callback([entry], this);
  });

  unobserve = jest.fn();
  disconnect = jest.fn();
}

window.ResizeObserver = MockResizeObserver;

// Mock IntersectionObserver for visibility detection
class MockIntersectionObserver {
  private callback: IntersectionObserverCallback;
  private options?: IntersectionObserverInit;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
  }

  observe = jest.fn((target: Element) => {
    // Simulate intersection with default values
    const entry: IntersectionObserverEntry = {
      target,
      boundingClientRect: target.getBoundingClientRect(),
      intersectionRatio: 1,
      intersectionRect: target.getBoundingClientRect(),
      isIntersecting: true,
      rootBounds: null,
      time: Date.now(),
    };
    this.callback([entry], this);
  });

  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn(() => []);
  root = null;
  rootMargin = this.options?.rootMargin || '0px';
  thresholds = this.options?.threshold ? 
    Array.isArray(this.options.threshold) ? 
      this.options.threshold : [this.options.threshold] 
    : [0];
}

window.IntersectionObserver = MockIntersectionObserver;

// Performance measurement utilities
const mockPerformance = {
  mark: jest.fn(),
  measure: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
};

Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    ...window.performance,
    ...mockPerformance,
  },
});

// Mock console methods for test output control
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: any[]) => {
  // Ignore specific React-related warnings in test environment
  const suppressedWarnings = [
    'Warning: ReactDOM.render is no longer supported',
    'Warning: React.createFactory()',
  ];
  
  if (!suppressedWarnings.some(warning => args[0]?.includes(warning))) {
    originalConsoleError.apply(console, args);
  }
};

console.warn = (...args: any[]) => {
  // Ignore specific React-related warnings in test environment
  const suppressedWarnings = [
    'Warning: componentWill',
    'Warning: Cannot update a component',
  ];
  
  if (!suppressedWarnings.some(warning => args[0]?.includes(warning))) {
    originalConsoleWarn.apply(console, args);
  }
};

// Cleanup utilities
afterEach(() => {
  // Reset all mocks after each test
  jest.clearAllMocks();
  
  // Reset console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});