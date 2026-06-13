import { GraphQLClient } from 'graphql-request';
import { Environment } from '@/lib/config';
import { getToken } from '@/app/session';
import { isAuthError } from '@/lib/authError';

// Token is read fresh per request from the session store, then attached as a
// Bearer header (server contract unchanged from the legacy client).
export const gqlClient = new GraphQLClient(Environment.GRAPHQL_URL, {
  requestMiddleware: request => {
    const token = getToken();
    if (!token) return request;
    return {
      ...request,
      headers: { ...request.headers, Authorization: `Bearer ${token}` },
    };
  },
  // Central choke point for auth failures (queries, loaders, mutations,
  // background refetches): try a silent token refresh, and only fall back to the
  // login redirect if that fails. Imported lazily to avoid a static import cycle.
  responseMiddleware: response => {
    if (isAuthError(response)) {
      void import('@/app/tokenRefresh').then(m => m.handleAuthError());
    }
  },
});
