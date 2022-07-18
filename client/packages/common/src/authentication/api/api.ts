import { LocaleKey, TypedTFunction } from '../..';
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
const authTokenGuard = (
  authTokenQuery: AuthTokenQuery,
  t: TypedTFunction<LocaleKey>
): AuthenticationResponse => {
  if (authTokenQuery?.authToken?.__typename === 'AuthToken') {
    return { token: authTokenQuery.authToken.token };
  }

  if (authTokenQuery?.authToken?.__typename === 'AuthTokenError') {
    switch (authTokenQuery.authToken.error.__typename) {
      case 'InvalidCredentials':
        return {
          token: '',
          error: { message: '' },
        };
      default:
        return { token: '', error: { message: '' } };
    }
  }

  return {
    token: '',
    error: { message: t('error.authentication-error') },
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

export const getAuthQueries = (sdk: Sdk, t: TypedTFunction<LocaleKey>) => ({
  get: {
    authToken: async ({
      username,
      password,
    }: {
      username: string;
      password: string;
    }): Promise<AuthenticationResponse> => {
      try {
        const result = await sdk.authToken({
          username,
          password,
        });
        return authTokenGuard(result, t);
      } catch (e) {
        const error = e as Error;
        if ('message' in error) {
          console.error(error.message);
        }
        return {
          token: '',
          error: {
            message: t('error.authentication-error'),
          },
        };
      }
    },
    refreshToken: async (): Promise<RefreshResponse> => {
      const result = await sdk.refreshToken();
      return refreshTokenGuard(result);
    },
    me: async (token?: string) => {
      try {
        const result = await sdk.me(
          {},
          {
            Authorization: `Bearer ${token}`,
          }
        );
        return result.me;
      } catch {}
    },
    stores: () => async () => {
      const result = await sdk.me();
      return result?.me?.stores?.nodes;
    },
  },
});
