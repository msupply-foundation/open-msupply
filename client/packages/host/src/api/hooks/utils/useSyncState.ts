import { useQuery } from '@openmsupply-client/common';
import { useHostApi } from './useHostApi';

export const useSyncState = (refetchInterval: number | false = false) => {
  const api = useHostApi();
  return useQuery(api.keys.syncState(), api.get.syncState, {
    cacheTime: 0,
    refetchInterval,
  });
};
