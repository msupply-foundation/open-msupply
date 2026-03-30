import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import { DocumentNode, print } from 'graphql';
import { useGql } from '../GqlContext';
import { useAuthContext } from '../../authentication/AuthContext';
import {
  disposeSubscriptionClient,
  getSubscriptionClient,
} from '../SubscriptionClient';

interface UseSubscriptionOptions<TSubscription, TCacheData> {
  /** react-query cache key to update when subscription data arrives */
  queryKey: readonly unknown[];
  /** GraphQL subscription document */
  document: DocumentNode;
  /** Optional variables for the subscription */
  variables?: Record<string, unknown>;
  /** Whether the subscription is enabled */
  enabled?: boolean;
  /**
   * Transform the typed subscription response before writing to cache.
   * Use this to reshape subscription payloads to match query cache shape.
   * e.g. `data => ({ syncStatus: data.syncStatusUpdated })`
   */
  select: (data: TSubscription) => TCacheData;
}

interface UseSubscriptionResult {
  /** Whether the WebSocket subscription is currently connected and active */
  isSubscribed: boolean;
}

// Track the last token across all useSubscription instances.
// When it changes, we dispose the old client once so a fresh
// connection is made with the new token.
let lastKnownToken: string | undefined;

/**
 * Hook that subscribes to a GraphQL subscription over WebSocket and
 * writes incoming data into the react-query cache.
 *
 * Automatically re-subscribes when the auth token changes (e.g. after
 * re-authentication), disposing the old WebSocket connection so the
 * new one picks up the fresh token.
 */
export const useSubscription = <TSubscription, TCacheData>({
  queryKey,
  document,
  variables,
  enabled = true,
  select,
}: UseSubscriptionOptions<TSubscription, TCacheData>): UseSubscriptionResult => {
  const queryClient = useQueryClient();
  const { client: gqlClient } = useGql();
  const { token } = useAuthContext();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !token) {
      setIsSubscribed(false);
      return;
    }

    // When the token changes, dispose the old WebSocket client once
    // so a fresh connection is made with the new token.
    // The module-level lastKnownToken ensures this happens exactly once
    // across all useSubscription instances.
    if (token !== lastKnownToken) {
      lastKnownToken = token;
      disposeSubscriptionClient();
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
        next: ({ data }) => {
          if (!disposed && data) {
            const cacheData = select(data as TSubscription);
            queryClient.setQueryData(queryKey, cacheData);
            if (!isSubscribed) setIsSubscribed(true);
          }
        },
        error: () => {
          if (!disposed) setIsSubscribed(false);
        },
        complete: () => {
          if (!disposed) setIsSubscribed(false);
        },
      }
    );

    setIsSubscribed(true);

    return () => {
      disposed = true;
      setIsSubscribed(false);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
    // Re-subscribe when token changes (e.g. after re-authentication)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, document, token]);

  return { isSubscribed };
};
