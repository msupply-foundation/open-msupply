import { useAuthApi } from './useAuthApi';
import { useMutation } from 'react-query';
import { AuthQueries, RefreshResponse } from '../api';

export const useGetRefreshToken = () => {
  const api = useAuthApi();
  return useMutation<RefreshResponse, unknown, unknown, unknown>(
    AuthQueries.get.refreshToken(api)
  );
};
