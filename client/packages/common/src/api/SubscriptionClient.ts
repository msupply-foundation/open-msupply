import { createClient, Client } from 'graphql-ws';

let subscriptionClient: Client | null = null;
let currentUrl: string | null = null;

/**
 * Get or create a shared graphql-ws subscription client.
 * Lazily connects on first subscription; reconnects automatically.
 *
 * Auth: the WebSocket upgrade request carries the HttpOnly `session_{port}` cookie
 * automatically, so we no longer pass a Bearer token in `connectionParams`. The server reads
 * the cookie at connect time the same way it does for HTTP requests.
 */
export const getSubscriptionClient = (httpUrl: string): Client => {
  const wsUrl = httpToWsUrl(httpUrl) + '/ws';

  // Reuse existing client if URL hasn't changed
  if (subscriptionClient && currentUrl === wsUrl) {
    return subscriptionClient;
  }

  // Dispose old client if URL changed
  if (subscriptionClient) {
    subscriptionClient.dispose();
  }

  currentUrl = wsUrl;
  subscriptionClient = createClient({
    url: wsUrl,
    lazy: true,
    retryAttempts: Infinity,
    retryWait: async attempt => {
      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * 2 ** attempt, 30000);
      await new Promise(resolve => setTimeout(resolve, delay));
    },
  });

  return subscriptionClient;
};

/**
 * Force the WebSocket to reconnect (e.g. after login/logout).
 * Closes the current connection; the client automatically reconnects
 * and all active subscriptions resubscribe — picking up the latest session cookie.
 */
export const reconnectSubscriptionClient = () => {
  if (subscriptionClient) {
    subscriptionClient.terminate();
  }
};


function httpToWsUrl(httpUrl: string): string {
  // Replace /graphql suffix if present, then convert protocol
  const base = httpUrl.replace(/\/graphql\/?$/, '');
  return base.replace(/^http/, 'ws') + '/graphql';
}
