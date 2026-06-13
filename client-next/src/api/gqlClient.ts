import { GraphQLClient } from 'graphql-request';
import { Environment } from '@/lib/config';
import { getToken } from '@/app/session';

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
});
