import { useQuery } from '@openmsupply-client/common';
import { useRequestApi } from '../utils/useRequestApi';

export const useIndicators = (
  customerNameLinkId: string,
  periodId: string,
  programId: string
) => {
  const api = useRequestApi();
  return useQuery(
    api.keys.indicators(),
    () => api.getIndicators(customerNameLinkId, periodId, programId),
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};
