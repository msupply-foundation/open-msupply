import { useQuery } from '@openmsupply-client/common';
import { useResponseApi } from '../utils/useResponseApi';

export const useResponseLineStatsData = (
  enabled: boolean,
  requisitionLineId?: string
) => {
  const api = useResponseApi();
  return useQuery(
    api.keys.statsData(requisitionLineId ?? ''),
    () => api.get.stats(requisitionLineId ?? ''),
    {
      refetchOnMount: false,
      cacheTime: 0,
      onError: () => {},
      enabled: !!requisitionLineId && enabled,
    }
  );
};
