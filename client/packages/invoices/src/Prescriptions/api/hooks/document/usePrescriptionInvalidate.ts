import { useQueryClient } from '@openmsupply-client/common';
import { usePrescriptionApi } from '../../utils/usePrescriptionApi';

export const usePrescriptionInvalidate = () => {
  const queryClient = useQueryClient();
  const api = usePrescriptionApi();

  const invalidatePrescriptions = () => {
    alert('Invalidating prescriptions');
    queryClient.invalidateQueries(api.keys.base());
  };
  return invalidatePrescriptions;
};
