import { useQuery } from '@openmsupply-client/common';
import { useResponseApi } from '../utils/useResponseApi';

export const useResponseLineStatsData = (
  enabled: boolean,
  requisitionLineId?: string
) => {
  const api = useResponseApi();
  return useQuery({
    queryKey: api.keys.statsData(requisitionLineId ?? ''),
    queryFn: () => api.get.stats(requisitionLineId ?? ''),
    refetchOnMount: false,
    gcTime: 0,
    enabled: !!requisitionLineId && enabled
  });
};
