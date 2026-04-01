import { useMutation, useQuery } from '@openmsupply-client/common';
import { useSyncApi } from './useSyncApi';

export const useSyncStatus = (
  refetchInterval: number | false = false,
  enabled?: boolean
) => {
  const api = useSyncApi();

  return useQuery({
    queryKey: api.keys.syncStatus(),
    queryFn: api.get.syncStatus,
    gcTime: 0,
    refetchInterval,
    enabled
  });
};

export const useMutateSyncStatus = () => {
  const api = useSyncApi();
  return useMutation({
    mutationFn: api.get.syncStatus
  });
};
