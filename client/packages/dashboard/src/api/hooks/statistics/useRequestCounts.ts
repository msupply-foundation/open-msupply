import { useQuery } from '@openmsupply-client/common';
import { useDashboardApi } from '../utils/useDashboardApi';

export const useRequestCounts = () => {
  const api = useDashboardApi();
  return useQuery(api.keys.response(), api.get.requestRequisitionCounts, {
    retry: false,
    onError: () => {},
  });
};
