import { useGql, useQuery } from '@openmsupply-client/common';
import { useSubscription } from './useSubscription';
import {
  getSdk,
  InitialisationStatusUpdatedDocument,
  InitialisationStatusUpdatedSubscription,
  InitialisationStatusQuery,
} from '../operations.generated';

export const useInitialisationStatus = (
  refetchInterval: number | false = false,
  shouldSuspend?: boolean
) => {
  const { client } = useGql();
  const sdk = getSdk(client);

  const queryKey = 'initialisationStatus';

  const { isSubscribed } = useSubscription<
    InitialisationStatusUpdatedSubscription,
    InitialisationStatusQuery['initialisationStatus']
  >({
    queryKey: [queryKey],
    document: InitialisationStatusUpdatedDocument,
    enabled: true,
    requireAuth: false,
    select: data => data.initialisationStatusUpdated,
  });

  return useQuery(
    queryKey,
    async () => {
      const result = await sdk.initialisationStatus();
      return result?.initialisationStatus;
    },
    {
      cacheTime: 0,
      suspense: shouldSuspend,
      refetchInterval: isSubscribed ? false : refetchInterval,
    }
  );
};
