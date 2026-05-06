import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';

export const useGetUserDetails = () => {
  const api = useAuthApi();
  return useMutation({ mutationFn: api.get.me });
};

export const useUserDetails = (token: string) => {
  const api = useAuthApi();
  return useQuery({
    queryKey: api.keys.me(token),
    queryFn: () => api.get.me(token),
    enabled: !!token,
  });
};

export const useUserPermissions = () => {
  const api = useAuthApi();
  return useMutation({ mutationFn: api.get.permissions });
};

export const useLastSuccessfulUserSync = () => {
  const api = useAuthApi();
  return useQuery({
    queryKey: api.keys.userSync(),
    queryFn: api.get.lastSuccessfulUserSync,
    gcTime: 0,
  });
};
