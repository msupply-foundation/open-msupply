import { useQuery } from '@openmsupply-client/common';
import { useResponseApi } from './useResponseApi';

export const useHasCustomerProgramRequisitionSettings = (
  customerNameIds: string[],
  enabled: boolean = false
) => {
  const api = useResponseApi();

  return useQuery(
    api.keys.programSettings(),
    () => api.hasCustomerProgramRequisitionSettings(customerNameIds),
    { enabled }
  );
};
