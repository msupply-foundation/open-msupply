import { useState } from 'react';
import { useAuthApi } from './useAuthApi';
import { useQuery } from 'react-query';
import { COOKIE_LIFETIME_MINUTES } from '../../AuthContext';
import { useDebounceCallback } from '@common/hooks';

export const useGetRefreshToken = (token: string) => {
  const api = useAuthApi();
  const [enabled, setEnabled] = useState(false);
  const refetchInterval = Math.max(COOKIE_LIFETIME_MINUTES - 1, 1) * 60 * 1000;
  const debouncedSetEnabled = useDebounceCallback(
    setEnabled,
    [token],
    refetchInterval
  );

  debouncedSetEnabled(!!token);

  return useQuery(api.keys.refresh(token), api.get.refreshToken, {
    refetchInterval,
    enabled,
  });
};
