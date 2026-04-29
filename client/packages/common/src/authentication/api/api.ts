import {
  InternalServerError,
  LocaleKey,
  NetworkError,
  TypedTFunction,
} from '../..';
import { Sdk, AuthTokenQuery, RefreshTokenQuery } from './operations.generated';

export type AuthenticationError = {
  message: string;
  detail?: string;
  stdError?: string | undefined;
  timeoutRemaining?: number;
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
    return {
      token: '',
      error: {
        message: authTokenQuery.authToken.error.__typename,
        timeoutRemaining:
          authTokenQuery.authToken.error.__typename === 'AccountBlocked'
            ? authTokenQuery.authToken.error.timeoutRemaining
            : undefined,
      },
    };
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
        const err = e as Error & { detail?: string };
        if (err?.message) console.error(err.message);

        const isNetwork = e instanceof NetworkError;
        const stdError =
          e instanceof InternalServerError ? err.detail : undefined;

        return {
          token: '',
          error: {
            message: isNetwork ? 'ConnectionError' : 'UnknownError',
            detail: err?.detail ?? err?.message,
            stdError,
          },
        };
      }
    },
    refreshToken: async (): Promise<RefreshResponse> => {
      const result = await sdk.refreshToken();
      return refreshTokenGuard(result);
    },
    isCentralServer: async () => {
      const result = await sdk.isCentralServer();
      return result.isCentralServer;
    },
    me: async (token?: string) => {
      const result = await sdk.me(
        {},
        {
          Authorization: `Bearer ${token}`,
        }
      );
      return result.me;
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
    lastSuccessfulUserSync: async () => {
      return (await sdk.lastSuccessfulUserSync()).lastSuccessfulUserSync
        .lastSuccessfulSync;
    },
    updateUser: async () => {
      const result = await sdk.updateUser();

      return result.updateUser;
    },
  },
});
