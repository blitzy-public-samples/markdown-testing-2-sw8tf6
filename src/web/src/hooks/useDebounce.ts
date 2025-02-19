import { useEffect, useState } from 'react'; // ^18.0.0

/**
 * A custom hook that provides debounced value updates to prevent excessive operations
 * when handling rapidly changing values.
 * 
 * @template T The type of value being debounced
 * @param value The value to debounce
 * @param delay The delay in milliseconds before updating the debounced value
 * @returns The debounced value of type T
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 300);
 */
const useDebounce = <T>(value: T, delay: number): T => {
  // Initialize state with the initial value
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Create a timeout to update the debounced value after the specified delay
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function to clear the timeout if value changes or component unmounts
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]); // Re-run effect if value or delay changes

  return debouncedValue;
};

export default useDebounce;