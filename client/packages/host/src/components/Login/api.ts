import {
  UseQueryResult,
  useOmSupplyApi,
  useQuery,
  AuthTokenQuery,
} from '@openmsupply-client/common';

interface AuthenticationResponse {
  token: string;
  error?: {
    message: string;
  };
}

const tokenGuard = (authTokenQuery: AuthTokenQuery): AuthenticationResponse => {
  if (authTokenQuery.authToken.__typename === 'AuthToken') {
    return { token: authTokenQuery.authToken.token };
  }

  if (authTokenQuery.authToken.__typename === 'AuthTokenError') {
    switch (authTokenQuery.authToken.error.__typename) {
      case 'DatabaseError':
      case 'InternalError':
        return {
          token: '',
          error: { message: authTokenQuery.authToken.error.description },
        };
    }
  }

  return { token: '', error: { message: '' } };
};

interface LoginCredentials {
  username: string;
  password: string;
}

export const useAuthToken = (
  credentials: LoginCredentials,
  login: boolean
): UseQueryResult<AuthenticationResponse> => {
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
