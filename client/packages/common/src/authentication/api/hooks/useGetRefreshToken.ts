import { useAuthApi } from './useAuthApi';
import { useMutation } from '@tanstack/react-query';

export const useGetRefreshToken = () => {
  const api = useAuthApi();
  return useMutation({ mutationFn: api.get.refreshToken });
};
