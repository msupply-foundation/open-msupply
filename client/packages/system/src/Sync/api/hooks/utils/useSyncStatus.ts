import { useMutation, useQuery, useSubscription } from '@openmsupply-client/common';
import { useSyncApi } from './useSyncApi';
import {
  SyncStatusUpdatedDocument,
  SyncStatusUpdatedSubscription,
} from '../../operations.generated';

export const useSyncStatus = (
  refetchInterval: number | false = false,
  enabled?: boolean
) => {
  const api = useSyncApi();

  const { isSubscribed } = useSubscription<
    SyncStatusUpdatedSubscription,
    { syncStatus: SyncStatusUpdatedSubscription['syncStatusUpdated'] }
  >({
    queryKey: api.keys.syncStatus(),
    document: SyncStatusUpdatedDocument,
    enabled: enabled !== false,
    select: data => ({ syncStatus: data.syncStatusUpdated }),
  });

  return useQuery(api.keys.syncStatus(), api.get.syncStatus, {
    cacheTime: 0,
    refetchInterval: isSubscribed ? false : refetchInterval,
    enabled,
  });
};

export const useMutateSyncStatus = () => {
  const api = useSyncApi();
  return useMutation(api.get.syncStatus);
};
