import { useMutation, useQuery } from 'react-query';
import { useAuthApi } from './useAuthApi';

export const useGetUserDetails = () => {
  const api = useAuthApi();
  return useMutation(api.get.me);
};

export const useUserDetails = (token: string) => {
  const api = useAuthApi();
  return useQuery(api.keys.me(token), () => api.get.me(token), {
    enabled: !!token,
  });
};

export const useUserPermissions = () => {
  const api = useAuthApi();
  return useMutation(api.get.permissions);
};

export const useLastSuccessfulUserSync = () => {
  const api = useAuthApi();
  return useQuery(api.keys.userSync(), api.get.lastSuccessfulUserSync, {
    cacheTime: 0,
  });
};
