import { useQuery } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useSyncSettings = () => {
  const api = useHostApi();
  return useQuery(api.keys.syncSettings(), api.get.syncSettings, {
    cacheTime: 0,
  });
};
