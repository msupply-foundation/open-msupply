import { useGql, useQuery } from '@openmsupply-client/common';
import { useSubscription } from './useSubscription';
import {
  getSdk,
  InitialisationStatusUpdatedDocument,
  InitialisationStatusUpdatedSubscription,
} from '../operations.generated';

export const useInitialisationStatus = (
  refetchInterval: number | false = false
) => {
  const { client } = useGql();
  const sdk = getSdk(client);

  const queryKey = 'initialisationStatus';

  const { isSubscribed, data: subData } = useSubscription({
    document: InitialisationStatusUpdatedDocument,
    enabled: true,
    requireAuth: false,
    select: (data: InitialisationStatusUpdatedSubscription) =>
      data.initialisationStatusUpdated,
  });

  // Fallback to polling if subscription fails or is unavailable
  const { data: queryData, ...rest } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const result = await sdk.initialisationStatus();
      return result?.initialisationStatus;
    },
    gcTime: 0,
    refetchInterval: isSubscribed ? false : refetchInterval,
  });

  return { ...rest, data: subData ?? queryData };
};
