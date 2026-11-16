import { useQuery } from '@openmsupply-client/common';
import { useDashboardApi } from '../utils/useDashboardApi';

export const useRequisitionCounts = () => {
  const api = useDashboardApi();
  return useQuery({
    queryKey: api.keys.requisition(),
    queryFn: api.get.requisitionCounts,
    retry: false,
  });
};
