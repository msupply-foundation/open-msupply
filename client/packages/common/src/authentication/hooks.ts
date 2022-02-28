import { useOmSupplyApi } from '../api';
import { RefreshTokenQuery, RefreshTokenResponse } from '../types';
import { useMutation } from 'react-query';

const tokenGuard = (
  refreshTokenQuery: RefreshTokenQuery
): Omit<RefreshTokenResponse, '__typename'> => {
  if (refreshTokenQuery.refreshToken.__typename === 'RefreshToken') {
    return { token: refreshTokenQuery.refreshToken.token };
  }

  return { token: '' };
};

export const useGetRefreshToken = () => {
  const { api } = useOmSupplyApi();
  return useMutation<
    Omit<RefreshTokenResponse, '__typename'>,
    unknown,
    unknown,
    unknown
  >(async () => {
    const result = await api.refreshToken();
    return tokenGuard(result);
  });
};
