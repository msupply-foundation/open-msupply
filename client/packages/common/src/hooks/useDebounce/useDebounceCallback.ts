import { useCallback, DependencyList } from 'react';
import { FnUtils } from '@common/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useDebounceCallback = <T extends (...args: any[]) => any>(
  callback: T,
  depsArray: DependencyList,
  wait = 500
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  const memoizedCallback = useCallback(FnUtils.debounce(callback, wait), []);
  const debounced = useCallback(memoizedCallback, depsArray);

  return debounced;
};
