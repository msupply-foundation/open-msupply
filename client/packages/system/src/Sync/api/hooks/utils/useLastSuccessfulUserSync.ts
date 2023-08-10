import { useQuery } from '@openmsupply-client/common';
import { useSyncApi } from './useSyncApi';

export const useLastSuccessfulUserSync = () => {
  const api = useSyncApi();
  return useQuery(api.keys.userSync(), api.lastSuccessfulUserSync, {
    cacheTime: 0,
  });
};
