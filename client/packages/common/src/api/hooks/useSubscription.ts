import { useEffect, useRef, useState } from 'react';
import { DocumentNode, print } from 'graphql';
import { useGql } from '../GqlContext';
import { useAuthContext } from '../../authentication/AuthContext';
import {
  getConnectionState,
  getSubscriptionClient,
  reconnectSubscriptionClient,
  subscribeToConnectionState,
} from '../SubscriptionClient';

interface UseSubscriptionOptions<TSubscription, TData> {
  /** GraphQL subscription document */
  document: DocumentNode;
  /** Optional variables for the subscription */
  variables?: Record<string, unknown>;
  /** Whether the subscription is enabled */
  enabled?: boolean;
  /** Whether an auth token is required to subscribe. Defaults to true.
   *  Set to false for unauthenticated subscriptions (e.g. during initialisation). */
  requireAuth?: boolean;
  /** Transform the raw subscription response into the shape consumers need. */
  select: (data: TSubscription) => TData;
}

interface UseSubscriptionResult<TData> {
  /** Whether the WebSocket subscription is currently connected and active */
  isSubscribed: boolean;
  /** Latest data received from the subscription, or undefined if none yet */
  data: TData | undefined;
}

// Track the last known auth signal across all useSubscription instances.
// When it flips we dispose the old client once so a fresh connection picks up the latest
// session cookie. (The cookie itself isn't readable from JS, so we use the boolean as a proxy.)
let lastKnownAuth: boolean | undefined;

/**
 * Hook that subscribes to a GraphQL subscription over WebSocket and
 * returns the latest data via local state.
 *
 * Consuming hooks merge this with useQuery data — subscription takes
 * priority, query provides initial fetch and polling fallback.
 *
 * Automatically re-subscribes when auth state changes (e.g. after re-authentication).
 */
export const useSubscription = <TSubscription, TData>({
  document,
  variables,
  enabled = true,
  requireAuth = true,
  select,
}: UseSubscriptionOptions<
  TSubscription,
  TData
>): UseSubscriptionResult<TData> => {
  const { client: gqlClient } = useGql();
  const { isAuthenticated } = useAuthContext();
  const [isConnected, setIsConnected] = useState(getConnectionState);
  const [data, setData] = useState<TData | undefined>(undefined);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setIsConnected(getConnectionState());
    return subscribeToConnectionState(setIsConnected);
  }, []);

  useEffect(() => {
    if (!enabled || (requireAuth && !isAuthenticated)) {
      setData(undefined);
      return;
    }

    if (isAuthenticated !== lastKnownAuth) {
      lastKnownAuth = isAuthenticated;
      reconnectSubscriptionClient();
    }

    const httpUrl = gqlClient.getUrl();
    if (!httpUrl) return;

    const wsClient = getSubscriptionClient(httpUrl);

    let disposed = false;

    unsubscribeRef.current = wsClient.subscribe(
      {
        query: print(document),
        variables,
      },
      {
        next: ({ data: rawData }) => {
          if (!disposed && rawData) {
            setData(select(rawData as TSubscription));
          }
        },
        error: () => {
          if (!disposed) {
            setData(undefined);
          }
        },
        complete: () => {
          if (!disposed) {
            setData(undefined);
          }
        },
      }
    );

    return () => {
      disposed = true;
      setData(undefined);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, document, isAuthenticated]);

  // Active only when the socket is connected, the caller has enabled it, and
  // (when auth is required) we believe we're logged in.
  const isSubscribed =
    isConnected && enabled && (!requireAuth || isAuthenticated);

  return { isSubscribed, data };
};
