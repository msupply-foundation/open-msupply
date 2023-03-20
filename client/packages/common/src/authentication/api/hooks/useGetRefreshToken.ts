import { useAuthApi } from './useAuthApi';
import { useMutation } from 'react-query';

export const useGetRefreshToken = () => {
  const api = useAuthApi();
  return useMutation(api.get.refreshToken);
};
