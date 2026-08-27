import { useEffect, useRef, useInsertionEffect, useCallback } from 'react';

type ArgsType = (number | string | object)[]; // Avoid `any` type
export type Callback = () => void;
export type EventCallback = (...args: ArgsType) => void;
export type Delay = number | null;

/**
 * Hook that lets you extract non-reactive logic into an effect event.
 * This is a kind of polyfill for the `useEffectEvent` hook that is still
 * in the experimental phase. Once it's stable, we can replace this hook with it.
 * @param callback An event callback function
 * @returns A function that can be called to execute the callback
 */
const useEffectEvent = (callback: EventCallback) => {
  const savedCallback = useRef<EventCallback>(callback);

  useInsertionEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  return useCallback((...args: ArgsType) => {
    savedCallback.current(...args);
  }, []);
};

/**
 * Custom hook for setInterval declarative usage in functional components.
 * It's a wrapper around the native `setInterval` function.
 * @see https://overreacted.io/making-setinterval-declarative-with-react-hooks/
 * @param callback Callback function to be executed after each delay
 * @param delay Delay in milliseconds between each execution of the callback
 */
export const useInterval = (callback: Callback, delay: Delay) => {
  const onTick = useEffectEvent(callback);

  // Set up the interval
  useEffect(() => {
    // Don't schedule if no delay is specified
    if (delay === null) return;

    const id = setInterval(onTick, delay);
    return () => clearInterval(id); // Cleanup the interval on component unmount
  }, [delay, onTick]);
};
