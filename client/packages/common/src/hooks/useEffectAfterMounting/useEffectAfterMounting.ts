import { DependencyList, EffectCallback, useEffect } from 'react';
import { useIsMountedRef } from '../useIsMountedRef';

export const useEffectAfterMounting = (
  callback: EffectCallback,
  deps?: DependencyList
): void => {
  useEffect(() => {
    if (isMounted.current) return callback();
  }, deps);

  const isMounted = useIsMountedRef();
};
