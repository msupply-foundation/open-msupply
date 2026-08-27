import { useCallback, useEffect, DependencyList } from 'react';
import { FnUtils } from '@common/utils';

/**
 * Executes a callback once only - after the deps have not changed for the specified wait time
 * Warning: this memoizes the provided callback function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useDebouncedValueCallback = <T extends (...args: any[]) => any>(
  callback: T,
  depsArray: DependencyList,
  wait = 500,
  callbackDepsArray: DependencyList = []
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  const memoizedCallback = useCallback(
    FnUtils.debounce(callback, wait),
    callbackDepsArray
  );
  const debounced = useCallback(memoizedCallback, [
    ...depsArray,
    memoizedCallback,
  ]);

  // Cancel any pending debounced call on unmount to prevent stale URL updates
  // after navigation (e.g. clicking a row while a filter input is still debouncing)
  useEffect(() => {
    return () => {
      memoizedCallback.cancel();
    };
  }, [memoizedCallback]);

  return debounced;
};
