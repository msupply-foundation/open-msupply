import { useAuthApi } from './useAuthApi';
import { useQuery } from 'react-query';
import { COOKIE_LIFETIME_MINUTES } from '../../AuthContext';

export const useGetRefreshToken = (token: string) => {
  const api = useAuthApi();
  return useQuery(api.keys.refresh(token), api.get.refreshToken, {
    refetchInterval: Math.max(COOKIE_LIFETIME_MINUTES - 1, 1) * 60 * 1000,
    enabled: !!token,
  });
};
