import { useGql, useQuery } from '@openmsupply-client/common';
import { useSubscription } from './useSubscription';
import {
  getSdk,
  InitialisationStatusUpdatedDocument,
  InitialisationStatusUpdatedSubscription,
} from '../operations.generated';

export const useInitialisationStatus = (
  refetchInterval: number | false = false,
  shouldSuspend?: boolean
) => {
  const { client } = useGql();
  const sdk = getSdk(client);

  const queryKey = 'initialisationStatus';

  const { isSubscribed, data: subData } = useSubscription<
    InitialisationStatusUpdatedSubscription,
    InitialisationStatusUpdatedSubscription['initialisationStatusUpdated']
  >({
    document: InitialisationStatusUpdatedDocument,
    enabled: true,
    requireAuth: false,
    select: data => data.initialisationStatusUpdated,
  });

  const { data: queryData, ...rest } = useQuery(
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

  return { ...rest, data: subData ?? queryData };
};
