import { useQuery } from '@openmsupply-client/common';
import { useResponseApi } from './useResponseApi';

export const useProgramRequisitionSettingsByCustomer = (customerNameId: string) => {
  const api = useResponseApi();

  return useQuery({
    queryKey: api.keys.programSettings(),
    queryFn: () => api.programRequisitionSettingsByCustomer(customerNameId)
  });
};
