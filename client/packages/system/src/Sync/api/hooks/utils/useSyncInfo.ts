import {
  useAuthContext,
  useQuery,
  useSubscription,
} from '@openmsupply-client/common';
import { useQueryClient } from 'react-query';
import { useSyncApi } from './useSyncApi';
import {
  SyncStatusUpdatedDocument,
  SyncStatusUpdatedSubscription,
  PushQueueCountUpdatedDocument,
  PushQueueCountUpdatedSubscription,
  SyncInfoQuery,
} from '../../operations.generated';

export const useSyncInfo = (
  refetchInterval: number | false = false,
  enabled: boolean = true
) => {
  const api = useSyncApi();
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  const isEnabled = !!token && enabled;
  const queryKey = api.keys.syncInfo();

  // Subscribe to real-time sync status updates via WebSocket.
  // Merges into existing cache data so we don't clobber numberOfRecordsInPushQueue.
  const { isSubscribed: isSyncStatusSubscribed } = useSubscription<
    SyncStatusUpdatedSubscription,
    SyncInfoQuery
  >({
    queryKey,
    document: SyncStatusUpdatedDocument,
    enabled: isEnabled,
    select: data => {
      const existing = queryClient.getQueryData<SyncInfoQuery>(queryKey);
      return {
        __typename: 'Queries' as const,
        numberOfRecordsInPushQueue:
          existing?.numberOfRecordsInPushQueue ?? 0,
        syncStatus: data.syncStatusUpdated ?? existing?.syncStatus ?? null,
      };
    },
  });

  // Subscribe to push queue count updates (debounced on the server).
  // Merges into existing cache data so we don't clobber syncStatus.
  const { isSubscribed: isPushQueueSubscribed } = useSubscription<
    PushQueueCountUpdatedSubscription,
    SyncInfoQuery
  >({
    queryKey,
    document: PushQueueCountUpdatedDocument,
    enabled: isEnabled,
    select: data => {
      const existing = queryClient.getQueryData<SyncInfoQuery>(queryKey);
      return {
        __typename: 'Queries' as const,
        numberOfRecordsInPushQueue: data.pushQueueCountUpdated,
        syncStatus: existing?.syncStatus ?? null,
      };
    },
  });

  const isSubscribed = isSyncStatusSubscribed || isPushQueueSubscribed;

  const { data, ...rest } = useQuery(
    queryKey,
    () => api.get.syncInfo(token),
    {
      refetchInterval: isSubscribed ? false : refetchInterval,
      enabled: isEnabled,
    }
  );

  return {
    ...rest,
    syncStatus: data?.syncStatus,
    numberOfRecordsInPushQueue: data?.numberOfRecordsInPushQueue,
  };
};
