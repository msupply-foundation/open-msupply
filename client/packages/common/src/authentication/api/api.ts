import {
  AuthError,
  LocaleKey,
  LocalStorage,
  GraphqlStdError,
  TypedTFunction,
} from '../..';
import { Sdk, AuthTokenQuery } from './operations.generated';

export type AuthenticationError = {
  message: string;
  detail?: string;
  stdError?: string | undefined;
  timeoutRemaining?: number;
};

export interface AuthenticationResponse {
  // Opaque session token returned by the server. The web client doesn't use it (the HttpOnly
  // cookie handles auth); we just expose it as a "did login succeed?" signal and for
  // backwards-compatible API integrations.
  token: string;
  error?: AuthenticationError;
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
        const error = e as GraphqlStdError;
        if ('message' in error) {
          console.error(error.message);
        }

        const errorMessage = error.message.includes('Network request failed')
          ? 'ConnectionError'
          : 'UnknownError';

        return {
          token: '',
          error: {
            message: errorMessage,
            detail: error.message,
            stdError: error.stdError,
          },
        };
      }
    },
    isCentralServer: async () => {
      const result = await sdk.isCentralServer();
      return result.isCentralServer;
    },
    isCentralStandalone: async () => {
      const result = await sdk.isCentralStandalone();
      return result.isCentralStandalone;
    },
    // Revokes the server-side session and clears the HttpOnly cookie. Best-effort: if the call
    // fails (network down, session already expired, etc.) we still proceed with client-side
    // cleanup — the goal is "ensure no live session", not "confirm with the server".
    logout: async () => {
      try {
        await sdk.logout();
      } catch {
        // ignore
      }
    },
    // Identity is read from the HttpOnly session cookie. No Authorization header needed.
    me: async () => {
      try {
        const result = await sdk.me({});
        return result.me;
      } catch (e) {
        // No/expired session is a normal state — the GqlContext middleware has
        // already flagged it as Unauthenticated and the app routes to login.
        // Escalating it to ServerError here armed the fatal "Server error"
        // dialog on every anonymous boot, and setLoginError's ServerError
        // guard then kept it alive across a successful login.
        if ((e as Error).message === AuthError.Unauthenticated) throw e;
        console.error(e);
        LocalStorage.setItem('/error/auth', AuthError.ServerError);
        LocalStorage.setItem('/error/server', (e as Error).message);
        throw e;
      }
    },
    permissions: async ({ storeId }: { storeId: string }) => {
      try {
        const result = await sdk.permissions({ storeId });
        return result?.me?.permissions;
      } catch (e) {
        console.error(e);
        return { nodes: [] };
      }
    },
  },
});
