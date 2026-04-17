import {
  useAuthContext,
  useQuery,
  useSubscription,
} from '@openmsupply-client/common';
import { useSyncApi } from './useSyncApi';
import {
  SyncInfoUpdatedDocument,
  SyncInfoUpdatedSubscription,
} from '../../operations.generated';

export const useSyncInfo = (
  refetchInterval: number | false = false,
  enabled: boolean = true
) => {
  const api = useSyncApi();
  const { token } = useAuthContext();

  const isEnabled = !!token && enabled;

  const { isSubscribed, data: subData } = useSubscription({
    document: SyncInfoUpdatedDocument,
    enabled: isEnabled,
    select: (data: SyncInfoUpdatedSubscription) => data.syncInfoUpdated,
  });

  // Fallback to polling if subscription fails or is unavailable
  const { data: queryData, ...rest } = useQuery(
    api.keys.syncInfo(),
    () => api.get.syncInfo(token),
    {
      refetchInterval: isSubscribed ? false : refetchInterval,
      // Everytime a new consumer mounts, they need to get the latest sync info, so we always want to refetch on mount
      // Any updates, will be handled by the subscription if it's working, otherwise we'll just get the latest info on the next poll
      refetchOnMount: 'always',
      enabled: isEnabled,
    }
  );

  return {
    ...rest,
    syncStatus: subData?.syncStatus ?? queryData?.syncStatus,
    numberOfRecordsInPushQueue:
      subData?.numberOfRecordsInPushQueue ??
      queryData?.numberOfRecordsInPushQueue,
  };
};
