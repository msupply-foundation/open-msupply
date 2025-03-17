import { useQuery } from '@openmsupply-client/common';
import { useResponseApi } from '../utils/useResponseApi';

export const useIndicators = (
  customerNameId: string,
  periodId: string,
  programId: string,
  enabled: boolean = true
) => {
  const api = useResponseApi();
  return useQuery(
    api.keys.indicators(),
    () => api.getIndicators(customerNameId, periodId, programId),
    {
      refetchOnMount: false,
      cacheTime: 0,
      enabled,
    }
  );
};
