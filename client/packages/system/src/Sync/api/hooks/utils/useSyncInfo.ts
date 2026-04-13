import { useAuthContext, useQuery } from '@openmsupply-client/common';
import { useSyncApi } from './useSyncApi';

export const useSyncInfo = (
  refetchInterval: number | false = false,
  enabled: boolean = true
) => {
  const api = useSyncApi();
  const { isAuthenticated } = useAuthContext();

  const { data, ...rest } = useQuery(
    api.keys.syncInfo(),
    () => api.get.syncInfo(),
    {
      refetchInterval,
      enabled: isAuthenticated && enabled,
    }
  );

  return {
    ...rest,
    syncStatus: data?.syncStatus,
    numberOfRecordsInPushQueue: data?.numberOfRecordsInPushQueue,
  };
};
