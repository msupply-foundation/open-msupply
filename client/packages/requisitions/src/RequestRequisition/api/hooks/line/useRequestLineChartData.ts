import { useQuery } from '@openmsupply-client/common';
import { useRequestApi } from '../utils/useRequestApi';

export const useRequestLineChartData = (requisitionLineId: string) => {
  const api = useRequestApi();
  return useQuery(
    api.keys.chartData(requisitionLineId),
    () => api.get.lineChartData(requisitionLineId),
    {
      refetchOnMount: false,
      cacheTime: 0,
      onError: () => {},
    }
  );
};
