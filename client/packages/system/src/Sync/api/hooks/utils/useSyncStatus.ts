import { useQuery } from '@openmsupply-client/common';
import { useSyncApi } from './useSyncApi';

export const useSyncStatus = (
  refetchInterval: number | false = false,
  enabled?: boolean
) => {
  const api = useSyncApi();

  return useQuery(api.keys.syncStatus(), api.get.syncStatus, {
    cacheTime: 0,
    refetchInterval,
    enabled,
  });
};
