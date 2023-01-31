import { useEffect, useRef, useState } from 'react';

const useDebouncedValue = <T>(value: T, wait = 500): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, wait);

    return () => clearTimeout(timer);
  }, [value, wait]);

  return debouncedValue;
};

// eslint-disable-next-line valid-jsdoc
/**
 * JSONForms-specific hook for debounced text input.
 *
 * In a JSONForm component the data prop changes after every user input. For
 * text input this can lead to performance issues which is mitigated by
 * debouncing the input events.
 *
 * However, there are two problem with debounced inputs which this component
 * solves:
 *
 * First, when the user is still typing while a debounced event arrives the
 * input field is updated to an old value effectively reverting user input done
 * in the meantime. This is solved by caching the user input and only displaying
 * this local cached data.
 *
 * Secondly, there are cases where the form data is updated without user input,
 * e.g. when resetting the form to the initial data. If the local cache is not
 * invalidated the form will show the old cached value. This problem is solved
 * by having a time based heuristic to determine if the data has been changed by
 * the user or if it is changed from the outside in which case the local cache
 * is reset.
 *
 */
export const useDebouncedTextInput = (
  data: string,
  handleChange: (value: string | undefined) => void
) => {
  // current text from user input
  const [text, setText] = useState<string | undefined>(data);
  // debounce to avoid rerendering the form on every key stroke which becomes a
  // performance issue
  const debouncedText = useDebouncedValue(text, 500);
  useEffect(() => {
    handleChange(debouncedText);
  }, [debouncedText]);

  // timestamp of the last key stroke
  const latestKey = useRef(0);
  useEffect(() => {
    if (Date.now() > latestKey.current + 500) setText(data);
  }, [data]);

  const onChange = (value: string) => {
    latestKey.current = Date.now();
    setText(value);
  };
  return { text, onChange };
};
