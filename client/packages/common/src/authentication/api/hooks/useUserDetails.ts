import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';

export const useGetUserDetails = () => {
  const api = useAuthApi();
  return useMutation({ mutationFn: api.get.me });
};

/**
 * Fetch the current user's details. With session-based auth the server reads the user from the
 * HttpOnly cookie, so there's nothing to pass in. The hook is always enabled — components that
 * don't want it to run should gate on `isAuthenticated` themselves.
 */
export const useUserDetails = () => {
  const api = useAuthApi();
  return useQuery({
    queryKey: api.keys.me(),
    queryFn: () => api.get.me(),
  });
};

export const useUserPermissions = () => {
  const api = useAuthApi();
  return useMutation({ mutationFn: api.get.permissions });
};
