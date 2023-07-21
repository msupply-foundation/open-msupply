import { useQuery } from '@openmsupply-client/common';
import { usePrescriptionApi } from '../../utils/usePrescriptionApi';
import { usePrescriptionNumber } from '../../utils/usePrescriptionNumber';

export const usePrescription = () => {
  const prescriptionNumber = usePrescriptionNumber();
  const api = usePrescriptionApi();

  return useQuery(
    api.keys.detail(prescriptionNumber),
    () => api.get.byNumber(prescriptionNumber),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};
