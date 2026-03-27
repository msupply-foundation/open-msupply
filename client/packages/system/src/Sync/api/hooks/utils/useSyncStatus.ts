import { useMutation, useQuery, useSubscription } from '@openmsupply-client/common';
import { useSyncApi } from './useSyncApi';
import { SyncStatusUpdatedDocument } from '../../subscriptions';

export const useSyncStatus = (
  refetchInterval: number | false = false,
  enabled?: boolean
) => {
  const api = useSyncApi();

  // Subscribe to real-time sync status updates via WebSocket.
  const { isSubscribed } = useSubscription({
    queryKey: api.keys.syncStatus(),
    document: SyncStatusUpdatedDocument,
    enabled: enabled !== false,
    select: data => ({ syncStatus: data['syncStatusUpdated'] }),
  });

  // Fall back to polling when subscription is not active
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
