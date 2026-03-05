import { useQuery } from '@openmsupply-client/common';
import { useRequestApi } from '../utils/useRequestApi';

export const useRequestLineChartData = (requisitionLineId: string) => {
  const api = useRequestApi();
  return useQuery({
    queryKey: api.keys.chartData(requisitionLineId),
    queryFn: () => api.get.lineChartData(requisitionLineId),
    refetchOnMount: false,
    gcTime: 0,
    onError: () => {}
  });
};
