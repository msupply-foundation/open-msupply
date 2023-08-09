import { useQuery } from '@openmsupply-client/common';
import { useSyncApi } from './useSyncApi';

export const useLastSuccessfulUserSync = (refetchInterval: number) => {
  const api = useSyncApi();
  return useQuery(api.keys.userInfo(), api.lastSuccessfulUserSync, {
    cacheTime: 0,
    refetchInterval,
  });
};
