import { useQuery } from '@openmsupply-client/common';
import { useDashboardApi } from '../utils/useDashboardApi';

export const useRequisitionCounts = () => {
  const api = useDashboardApi();
  return useQuery(api.keys.requisition(), api.get.requisitionCounts, {
    retry: false,
    onError: () => {},
  });
};
