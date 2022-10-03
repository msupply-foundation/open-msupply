import { useQuery } from '@openmsupply-client/common';
import { useHostApi } from './useHostApi';

export const useSyncInfo = (refetchInterval: number | false = false) => {
  const api = useHostApi();

  return useQuery(api.keys.syncInfo(), api.get.syncInfo, {
    cacheTime: 0,
    refetchInterval,
  });
};
