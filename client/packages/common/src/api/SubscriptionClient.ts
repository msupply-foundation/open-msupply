import { createClient, Client } from 'graphql-ws';
import { getAuthCookie } from '../authentication/AuthContext';

let subscriptionClient: Client | null = null;
let currentUrl: string | null = null;

/**
 * Get or create a shared graphql-ws subscription client.
 * Lazily connects on first subscription; reconnects automatically.
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
    connectionParams: () => {
      const { token } = getAuthCookie();
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
    retryAttempts: Infinity,
    retryWait: async attempt => {
      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * 2 ** attempt, 30000);
      await new Promise(resolve => setTimeout(resolve, delay));
    },
  });

  return subscriptionClient;
};

export const disposeSubscriptionClient = () => {
  if (subscriptionClient) {
    subscriptionClient.dispose();
    subscriptionClient = null;
    currentUrl = null;
  }
};

function httpToWsUrl(httpUrl: string): string {
  // Replace /graphql suffix if present, then convert protocol
  const base = httpUrl.replace(/\/graphql\/?$/, '');
  return base.replace(/^http/, 'ws') + '/graphql';
}
