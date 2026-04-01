import { useQuery } from '@openmsupply-client/common';
import { useResponseApi } from './useResponseApi';

export const useHasCustomerProgramRequisitionSettings = (
  customerNameIds: string[],
  enabled: boolean = false
) => {
  const api = useResponseApi();

  return useQuery({
    queryKey: api.keys.programSettings(),
    queryFn: () => api.hasCustomerProgramRequisitionSettings(customerNameIds),
    enabled
  });
};
