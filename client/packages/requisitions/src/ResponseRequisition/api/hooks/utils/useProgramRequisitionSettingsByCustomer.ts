import { useQuery } from '@openmsupply-client/common';
import { useResponseApi } from './useResponseApi';

export const useProgramRequisitionSettingsByCustomer = (customerStoreId: string) => {
  const api = useResponseApi();

  return useQuery(api.keys.programSettings(), () => api.programRequisitionSettingsByCustomer(customerStoreId));
};
