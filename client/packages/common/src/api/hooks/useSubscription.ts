import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import { DocumentNode, print } from 'graphql';
import { useGql } from '../GqlContext';
import { getSubscriptionClient } from '../SubscriptionClient';

interface UseSubscriptionOptions<TData> {
  /** react-query cache key to update when subscription data arrives */
  queryKey: readonly unknown[];
  /** GraphQL subscription document */
  document: DocumentNode;
  /** Optional variables for the subscription */
  variables?: Record<string, unknown>;
  /** Whether the subscription is enabled */
  enabled?: boolean;
  /**
   * Transform the raw subscription data before writing to cache.
   * Use this to reshape subscription payloads to match query cache shape.
   * e.g. `data => ({ syncStatus: data.syncStatusUpdated })`
   */
  select?: (data: Record<string, unknown>) => TData;
}

interface UseSubscriptionResult {
  /** Whether the WebSocket subscription is currently connected and active */
  isSubscribed: boolean;
}

/**
 * Hook that subscribes to a GraphQL subscription over WebSocket and
 * writes incoming data into the react-query cache.
 *
 * Components that read from the same query key will automatically
 * re-render when subscription data arrives.
 */
export const useSubscription = <TData = unknown>({
  queryKey,
  document,
  variables,
  enabled = true,
  select,
}: UseSubscriptionOptions<TData>): UseSubscriptionResult => {
  const queryClient = useQueryClient();
  const { client: gqlClient } = useGql();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsSubscribed(false);
      return;
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
            const cacheData = select
              ? select(data as Record<string, unknown>)
              : data;
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
    // Intentionally only re-run when enabled changes or document changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, document]);

  return { isSubscribed };
};
