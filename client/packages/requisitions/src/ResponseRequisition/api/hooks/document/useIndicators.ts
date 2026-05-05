import { useQuery } from '@openmsupply-client/common';
import { useResponseApi } from '../utils/useResponseApi';

export const useIndicators = (
  customerNameId: string,
  periodId: string,
  programId: string,
  enabled: boolean = true
) => {
  const api = useResponseApi();
  return useQuery({
    queryKey: api.keys.indicators(),
    queryFn: () => api.getIndicators(customerNameId, periodId, programId),
    refetchOnMount: false,
    gcTime: 0,
    enabled
  });
};
