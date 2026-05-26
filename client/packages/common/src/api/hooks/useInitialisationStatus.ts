import { useEffect } from 'react';
import { useGql, useQuery, useQueryClient } from '@openmsupply-client/common';
import { useSubscription } from './useSubscription';
import {
  getSdk,
  InitialisationStatusUpdatedDocument,
  InitialisationStatusUpdatedSubscription,
} from '../operations.generated';

export const INIT_STATUS_QUERY_KEY = 'initialisationStatus';

export const useInitialisationStatus = (
  refetchInterval: number | false = false
) => {
  const { client } = useGql();
  const sdk = getSdk(client);
  const queryClient = useQueryClient();

  const { isSubscribed, data: subData } = useSubscription({
    document: InitialisationStatusUpdatedDocument,
    enabled: true,
    requireAuth: false,
    select: (data: InitialisationStatusUpdatedSubscription) =>
      data.initialisationStatusUpdated,
  });

  // When the subscription fires, write the result into the query cache so that
  // hooks that read initStatus without subscribing (e.g. usePreferences) receive
  // the update reactively without creating their own WebSocket subscriptions.
  useEffect(() => {
    if (subData) {
      queryClient.setQueryData([INIT_STATUS_QUERY_KEY], subData);
    }
  }, [subData, queryClient]);

  // Fallback to polling if subscription fails or is unavailable
  const { data: queryData, ...rest } = useQuery({
    queryKey: [INIT_STATUS_QUERY_KEY],
    queryFn: async () => {
      const result = await sdk.initialisationStatus();
      return result?.initialisationStatus;
    },
    gcTime: 0,
    refetchInterval: isSubscribed ? false : refetchInterval,
  });

  return { ...rest, data: subData ?? queryData };
};
