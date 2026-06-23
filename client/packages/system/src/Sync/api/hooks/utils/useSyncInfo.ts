import { useEffect } from 'react';
import {
  useAuthContext,
  useQuery,
  useQueryClient,
  useSubscription,
} from '@openmsupply-client/common';
import { useSyncApi } from './useSyncApi';
import {
  SyncInfoQuery,
  SyncInfoUpdatedDocument,
  SyncInfoUpdatedSubscription,
} from '../../operations.generated';

export const useSyncInfo = (
  refetchInterval: number | false = false,
  enabled: boolean = true
) => {
  const api = useSyncApi();
  const queryClient = useQueryClient();
  const { token } = useAuthContext();

  const isEnabled = !!token && enabled;

  const { isSubscribed, data: subData } = useSubscription({
    document: SyncInfoUpdatedDocument,
    enabled: isEnabled,
    select: (data: SyncInfoUpdatedSubscription) => data.syncInfoUpdated,
  });

  // Fallback to polling if subscription fails or is unavailable
  const { data: queryData, ...rest } = useQuery({
    queryKey: api.keys.syncInfo(),
    queryFn: () => api.get.syncInfo(token),
    refetchInterval: isSubscribed ? false : refetchInterval,
    enabled: isEnabled,
  });

  // Write each subscription emit into the shared syncInfo cache (read below)
  // so every consumer - badge + modal - sees one value, newest write wins.
  useEffect(() => {
    if (!subData) return;
    queryClient.setQueryData<SyncInfoQuery>(api.keys.syncInfo(), prev => ({
      __typename: 'Queries',
      ...prev,
      numberOfRecordsInPushQueue: subData.numberOfRecordsInPushQueue,
      syncStatus: subData.syncStatus,
    }));
    // api.keys.syncInfo() is stable; queryClient is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subData]);

  return {
    ...rest,
    syncStatus: queryData?.syncStatus,
    numberOfRecordsInPushQueue: queryData?.numberOfRecordsInPushQueue,
  };
};
