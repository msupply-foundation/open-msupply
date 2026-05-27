import { useQuery } from '@openmsupply-client/common';
import { useSyncApi } from '../utils/useSyncApi';

export const useSyncSettings = () => {
  const api = useSyncApi();
  return useQuery({
    queryKey: api.keys.syncSettings(),
    queryFn: api.get.syncSettings,
    gcTime: 0
  });
};
