import { useQuery } from '@openmsupply-client/common';
import { useDashboardApi } from '../utils/useDashboardApi';

export const useResponseCounts = () => {
  const api = useDashboardApi();
  return useQuery(api.keys.response(), api.get.responseRequisitionCounts, {
    retry: false,
    onError: () => {},
  });
};
