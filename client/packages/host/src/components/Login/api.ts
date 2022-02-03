import {
  UseQueryResult,
  useOmSupplyApi,
  useQuery,
  AuthTokenQuery,
} from '@openmsupply-client/common';

const tokenGuard = (authTokenQuery: AuthTokenQuery): string => {
  if (authTokenQuery.authToken.__typename === 'AuthToken') {
    return authTokenQuery.authToken.token;
  } else {
    throw new Error(authTokenQuery.authToken.error.description);
  }
};

interface LoginCredentials {
  username: string;
  password: string;
}

export const useAuthToken = (
  credentials: LoginCredentials,
  login: boolean
): UseQueryResult<string> => {
  const { api } = useOmSupplyApi();

  return useQuery(
    ['authToken', credentials],
    async () => {
      const result = await api.authToken(credentials);

      return tokenGuard(result);
    },
    {
      cacheTime: 0,
      enabled: login,
    }
  );
};
