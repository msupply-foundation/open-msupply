import { createClient, Client } from 'graphql-ws';
import { getAuthCookie } from '../authentication/AuthContext';

let subscriptionClient: Client | null = null;
let currentUrl: string | null = null;

// Tracks whether the WebSocket is actually connected, with listeners notified
// on change
let isConnected = false;
const connectionListeners = new Set<(connected: boolean) => void>();

const setConnected = (connected: boolean) => {
  if (isConnected === connected) return;
  isConnected = connected;
  connectionListeners.forEach(listener => listener(connected));
};

export const getConnectionState = (): boolean => isConnected;

export const subscribeToConnectionState = (
  listener: (connected: boolean) => void
): (() => void) => {
  connectionListeners.add(listener);
  return () => {
    connectionListeners.delete(listener);
  };
};

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
  setConnected(false);
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

  subscriptionClient.on('connected', () => setConnected(true));
  subscriptionClient.on('closed', () => setConnected(false));
  subscriptionClient.on('error', () => setConnected(false));

  return subscriptionClient;
};

/**
 * Force the WebSocket to reconnect (e.g. after token change).
 * Closes the current connection; the client automatically reconnects
 * and all active subscriptions resubscribe with fresh connectionParams.
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
