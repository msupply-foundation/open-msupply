import { useCallback, DependencyList } from 'react';
import { debounce } from './../../utils/debounce/debounce';

export const useDebounceCallback = <T extends (...args: any[]) => any>(
  callback: T,
  depsArray: DependencyList,
  wait = 500
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  const debounced = useCallback(debounce(callback, wait), depsArray);

  return debounced;
};
