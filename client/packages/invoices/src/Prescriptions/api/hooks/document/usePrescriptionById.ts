import { useQuery } from '@openmsupply-client/common';
import { usePrescriptionApi } from '../../utils/usePrescriptionApi';

export const usePrescriptionById = (invoiceId: string = '') => {
  const api = usePrescriptionApi();

  return useQuery(
    api.keys.detail(invoiceId),
    () => api.get.byId(invoiceId),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};
