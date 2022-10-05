import { useQuery } from '@openmsupply-client/common';
import { useHostApi } from './useHostApi';

export const useSyncStatus = (refetchInterval: number | false = false) => {
  const api = useHostApi();

  return useQuery(api.keys.syncStatus(), api.get.syncStatus, {
    cacheTime: 0,
    refetchInterval,
  });
};
