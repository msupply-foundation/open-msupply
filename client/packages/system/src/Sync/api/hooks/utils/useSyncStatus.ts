import { useMutation, useQuery, useSubscription } from '@openmsupply-client/common';
import { useSyncApi } from './useSyncApi';
import {
  SyncInfoUpdatedDocument,
  SyncInfoUpdatedSubscription,
} from '../../operations.generated';

export const useSyncStatus = (
  refetchInterval: number | false = false,
  enabled?: boolean,
  requireAuth?: boolean
) => {
  const api = useSyncApi();

  const { isSubscribed, data: subData } = useSubscription({
    document: SyncInfoUpdatedDocument,
    enabled: enabled !== false,
    requireAuth,
    select: (data: SyncInfoUpdatedSubscription) =>
      data.syncInfoUpdated.syncStatus,
  });

  // Fallback to polling if subscription fails or is unavailable
  const { data: queryData, ...rest } = useQuery(
    api.keys.syncStatus(),
    api.get.syncStatus,
    {
      cacheTime: 0,
      refetchInterval: isSubscribed ? false : refetchInterval,
      enabled,
    }
  );

  return {
    ...rest,
    data: subData ?? queryData ?? null,
  };
};

export const useMutateSyncStatus = () => {
  const api = useSyncApi();
  return useMutation(api.get.syncStatus);
};
