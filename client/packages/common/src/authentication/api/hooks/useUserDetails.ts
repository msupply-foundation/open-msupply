import { useMutation, useQuery } from 'react-query';
import { useAuthApi } from './useAuthApi';
import { useAuthContext } from '../../AuthContext';

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
  const { token, storeId } = useAuthContext();
  return useQuery(api.keys.userSync(), api.get.lastSuccessfulUserSync, {
    cacheTime: 0,
    // Requires a sync-info-permitted context. Without a store the user has
    // no permissions, so the server rejects with Unauthenticated — gate by
    // storeId so we don't fire it on the no-store-assigned screen.
    enabled: !!token && !!storeId,
  });
};
