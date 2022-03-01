import { AuthApi } from './hooks';
import { AuthTokenQuery, RefreshTokenQuery } from './operations.generated';

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

const authTokenGuard = (
  authTokenQuery: AuthTokenQuery
): AuthenticationResponse => {
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

const refreshTokenGuard = (
  refreshTokenQuery: RefreshTokenQuery
): RefreshResponse => {
  if (refreshTokenQuery.refreshToken.__typename === 'RefreshToken') {
    return { token: refreshTokenQuery.refreshToken.token };
  }

  return { token: '' };
};

export const AuthQueries = {
  get: {
    authToken:
      (api: AuthApi) =>
      async ({
        username,
        password,
      }: {
        username: string;
        password: string;
      }): Promise<AuthenticationResponse> => {
        const result = await api.authToken({
          username,
          password,
        });
        return authTokenGuard(result);
      },
    refreshToken: (api: AuthApi) => async (): Promise<RefreshResponse> => {
      const result = await api.refreshToken();
      return refreshTokenGuard(result);
    },
  },
};
