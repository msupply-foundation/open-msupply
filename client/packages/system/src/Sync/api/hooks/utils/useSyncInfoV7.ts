import {
  useAuthContext,
  useQuery,
  useSubscription,
} from '@openmsupply-client/common';
import { useSyncApi } from './useSyncApi';
import {
  SyncInfoV7UpdatedDocument,
  SyncInfoV7UpdatedSubscription,
} from '../../operations.generated';

export const useSyncInfoV7 = (
  refetchInterval: number | false = false,
  enabled: boolean = true
) => {
  const api = useSyncApi();
  const { token } = useAuthContext();

  const isEnabled = !!token && enabled;

  const { isSubscribed, data: subData } = useSubscription({
    document: SyncInfoV7UpdatedDocument,
    enabled: isEnabled,
    select: (data: SyncInfoV7UpdatedSubscription) => data.syncInfoV7Updated,
  });

  const { data: queryData, ...rest } = useQuery(
    api.keys.syncInfoV7(),
    () => api.get.syncInfoV7(token),
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
