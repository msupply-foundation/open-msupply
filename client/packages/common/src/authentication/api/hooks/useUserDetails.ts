import { useQuery } from 'react-query';
import { useAuthApi } from './useAuthApi';

export const useUserDetails = (token?: string) => {
  const api = useAuthApi();
  return useQuery(api.keys.me(token || ''), api.get.me(), { cacheTime: 0 });
};
