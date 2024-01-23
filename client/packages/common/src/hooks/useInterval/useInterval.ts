import { useLayoutEffect, useEffect, useRef } from 'react';

export type Callback = () => void;
export type Delay = number | null;

export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Custom hook for setInterval declarative usage in functional components with support for server-side rendering.
 * It's a wrapper around the native setInterval function.
 * @see https://overreacted.io/making-setinterval-declarative-with-react-hooks/
 * @param callback Callback function to be executed after each delay
 * @param delay Delay in milliseconds between each execution of the callback
 */
export const useInterval = (callback: Callback, delay: Delay) => {
  const savedCallback = useRef<Callback>(callback);

  // Remember the latest callback
  useIsomorphicLayoutEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    const tick = () => savedCallback.current();

    // Don't schedule if no delay is specified
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id); // Cleanup the interval on component unmount
    }
  }, [delay]);
};
