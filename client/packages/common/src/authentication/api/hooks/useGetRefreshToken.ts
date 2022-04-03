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

  // The refresh request was being sent immediately upon login,
  // in a dev environment the refresh cookie is disallowed if using a remote hosted api
  // therefore the auto token is immediately invalidated!
  // the debounce will delay the initial refresh request, giving the dev env a bit of time
  debouncedSetEnabled(!!token);

  return {
    enabled,
    ...useQuery(api.keys.refresh(token), api.get.refreshToken, {
      refetchInterval,
      enabled,
    }),
  };
};
