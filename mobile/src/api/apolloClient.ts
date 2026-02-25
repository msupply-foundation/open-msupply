import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  Observable,
} from '@apollo/client';
import {setContext} from '@apollo/client/link/context';
import {onError} from '@apollo/client/link/error';
import {tokenStorage} from '../auth/tokenStorage';
import {appPreferences} from '../prefs/appPreferences';

// Dynamic HTTP link — reads the server URL on every request
const httpLink = new HttpLink({
  uri: async () => {
    const url = await appPreferences.getServerUrl();
    return `${url ?? 'http://localhost:8000'}/graphql`;
  },
});

// Attach the JWT bearer token to every request
const authLink = setContext(async (_, {headers}) => {
  const token = await tokenStorage.getToken();
  return {
    headers: {
      ...headers,
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
    },
  };
});

// On 401: try refreshing the token once, then retry
let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

const errorLink = onError(({graphQLErrors, operation, forward}) => {
  const isUnauthorized = graphQLErrors?.some(
    e => e.extensions?.code === 'UNAUTHENTICATED',
  );
  if (!isUnauthorized) return;

  if (isRefreshing) {
    return new Observable(observer => {
      pendingRequests.push(() => {
        forward(operation).subscribe(observer);
      });
    });
  }

  isRefreshing = true;
  return new Observable(observer => {
    refreshToken()
      .then(newToken => {
        if (newToken) {
          tokenStorage.setToken(newToken);
          pendingRequests.forEach(cb => cb());
          pendingRequests = [];
          forward(operation).subscribe(observer);
        } else {
          // Refresh failed — signal caller so they can navigate to Login
          observer.error(new Error('Session expired'));
        }
      })
      .finally(() => {
        isRefreshing = false;
      });
  });
});

async function refreshToken(): Promise<string | null> {
  try {
    // Use fetch directly to avoid circular dependency with Apollo client
    const url = await appPreferences.getServerUrl();
    const response = await fetch(`${url}/graphql`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include', // sends the refresh_token cookie
      body: JSON.stringify({
        query: `query refreshToken { refreshToken { ... on RefreshToken { token } } }`,
      }),
    });
    const json = await response.json();
    return json?.data?.refreshToken?.token ?? null;
  } catch {
    return null;
  }
}

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {fetchPolicy: 'cache-and-network'},
    query: {fetchPolicy: 'network-only'},
  },
});
