import { useEffect, useRef, useState } from 'react';
import { DocumentNode, print } from 'graphql';
import { useGql } from '../GqlContext';
import { useAuthContext } from '../../authentication/AuthContext';
import {
  getSubscriptionClient,
  reconnectSubscriptionClient,
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

// Track the last token across all useSubscription instances.
// When it changes, we dispose the old client once so a fresh
// connection is made with the new token.
let lastKnownToken: string | undefined;

/**
 * Hook that subscribes to a GraphQL subscription over WebSocket and
 * returns the latest data via local state.
 *
 * Consuming hooks merge this with useQuery data — subscription takes
 * priority, query provides initial fetch and polling fallback.
 *
 * Automatically re-subscribes when the auth token changes (e.g. after
 * re-authentication).
 */
export const useSubscription = <TSubscription, TData>({
  document,
  variables,
  enabled = true,
  requireAuth = true,
  select,
}: UseSubscriptionOptions<TSubscription, TData>): UseSubscriptionResult<TData> => {
  const { client: gqlClient } = useGql();
  const { token } = useAuthContext();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [data, setData] = useState<TData | undefined>(undefined);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || (requireAuth && !token)) {
      setIsSubscribed(false);
      return;
    }

    if (token !== lastKnownToken) {
      lastKnownToken = token;
      reconnectSubscriptionClient();
    }

    const httpUrl = gqlClient.getUrl();
    if (!httpUrl) return;

    const wsClient = getSubscriptionClient(httpUrl);

    let disposed = false;

    setIsSubscribed(true);

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
            setIsSubscribed(false);
            setData(undefined);
          }
        },
        complete: () => {
          if (!disposed) {
            setIsSubscribed(false);
            setData(undefined);
          }
        },
      }
    );

    return () => {
      disposed = true;
      setIsSubscribed(false);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, document, token]);

  return { isSubscribed, data };
};
