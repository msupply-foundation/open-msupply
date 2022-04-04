import { FilterBy } from '@common/hooks';
import { Sdk, AuthTokenQuery, RefreshTokenQuery } from './operations.generated';

export type AuthenticationError = {
  message: string;
};

export interface AuthenticationResponse {
  token: string;
  error?: AuthenticationError;
}

export interface RefreshResponse {
  token: string;
}

type ListParams = {
  filterBy: FilterBy | null;
  first: number;
  offset: number;
};

const authTokenGuard = (
  authTokenQuery: AuthTokenQuery
): AuthenticationResponse => {
  if (authTokenQuery?.authToken?.__typename === 'AuthToken') {
    return { token: authTokenQuery.authToken.token };
  }

  if (authTokenQuery?.authToken?.__typename === 'AuthTokenError') {
    switch (authTokenQuery.authToken.error.__typename) {
      case 'InvalidCredentials':
        return {
          token: '',
          error: { message: authTokenQuery.authToken.error.description },
        };
    }
  }

  return {
    token: '',
    error: { message: 'Error communicating with the server' },
  };
};

const refreshTokenGuard = (
  refreshTokenQuery: RefreshTokenQuery
): RefreshResponse => {
  if (refreshTokenQuery.refreshToken.__typename === 'RefreshToken') {
    return { token: refreshTokenQuery.refreshToken.token };
  }

  return { token: '' };
};

export const getAuthQueries = (sdk: Sdk) => ({
  get: {
    authToken: async ({
      username,
      password,
    }: {
      username: string;
      password: string;
    }): Promise<AuthenticationResponse> => {
      const result = await sdk.authToken({
        username,
        password,
      });
      return authTokenGuard(result);
    },
    refreshToken: async (): Promise<RefreshResponse> => {
      const result = await sdk.refreshToken();
      return refreshTokenGuard(result);
    },
    stores:
      ({ filterBy, first, offset }: ListParams) =>
      async () => {
        const result = await sdk.stores({
          filter: filterBy,
          first,
          offset,
        });

        return result.stores;
      },
  },
});
