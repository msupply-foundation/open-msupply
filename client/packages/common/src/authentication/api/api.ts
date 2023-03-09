import { AuthError, LocaleKey, LocalStorage, TypedTFunction } from '../..';
import { Sdk, AuthTokenQuery, RefreshTokenQuery } from './operations.generated';

export type AuthenticationError = {
  message: string;
  detail?: string;
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
            detail: error.message,
          },
        };
      }
    },
    refreshToken: async (): Promise<RefreshResponse> => {
      console.info(`************ REFRESH TOKEN ************`);

      const result = await sdk.refreshToken();
      return refreshTokenGuard(result);
    },
    me: async (token?: string) => {
      try {
        // console.info(`************ ME ************ token: ${token}`);
        const result = await sdk.me(
          {},
          {
            Authorization: `Bearer ${token}`,
          }
        );
        return result.me;
      } catch (e) {
        console.error(e);
        LocalStorage.setItem('/auth/error', AuthError.ServerError);
      }
    },
    permissions: async ({
      storeId,
      token,
    }: {
      storeId: string;
      token?: string;
    }) => {
      try {
        const result = await sdk.permissions(
          { storeId },
          {
            Authorization: `Bearer ${token}`,
          }
        );
        return result?.me?.permissions;
      } catch (e) {
        console.error(e);
        return { nodes: [] };
      }
    },
    // stores: async () => {
    //   try {
    //     const result = await sdk.me();
    //     return result?.me?.stores?.nodes;
    //   } catch (e) {
    //     console.error(e);
    //     LocalStorage.setItem('/auth/error', AuthError.ServerError);
    //   }
    // },
  },
});
