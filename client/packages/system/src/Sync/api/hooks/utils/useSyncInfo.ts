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

  const { isSubscribed, data: subData } = useSubscription<
    SyncInfoUpdatedSubscription,
    SyncInfoUpdatedSubscription['syncInfoUpdated']
  >({
    document: SyncInfoUpdatedDocument,
    enabled: isEnabled,
    select: data => data.syncInfoUpdated,
  });

  const { data: queryData, ...rest } = useQuery(
    api.keys.syncInfo(),
    () => api.get.syncInfo(token),
    {
      refetchInterval: isSubscribed ? false : refetchInterval,
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
