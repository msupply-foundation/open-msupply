import { useQuery } from '@openmsupply-client/common';
import { useSyncApi } from '../utils/useSyncApi';

export const useSyncSettings = () => {
  const api = useSyncApi();
  return useQuery(api.keys.syncSettings(), api.get.syncSettings, {
    cacheTime: 0,
  });
};
