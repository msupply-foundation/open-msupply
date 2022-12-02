import { useQuery } from '@openmsupply-client/common';
import { useHostApi } from './useHostApi';

export const useSyncInfo = (refetchInterval: number | false = false) => {
  const api = useHostApi();

  const { data, ...rest } = useQuery(api.keys.syncInfo(), api.get.syncInfo, {
    refetchInterval,
  });

  return {
    ...rest,
    syncStatus: data?.syncStatus,
    numberOfRecordsInPushQueue: data?.numberOfRecordsInPushQueue,
  };
};
