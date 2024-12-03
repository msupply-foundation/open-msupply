import { useQuery } from '@openmsupply-client/common';
import { usePrescriptionApi } from '../../utils/usePrescriptionApi';

export const usePrescriptionById = (invoiceId: string = '') => {
  const api = usePrescriptionApi();

  return useQuery(api.keys.detail(invoiceId), () => api.get.byId(invoiceId), {
    refetchOnMount: false,
    cacheTime: 0,
  });
};
