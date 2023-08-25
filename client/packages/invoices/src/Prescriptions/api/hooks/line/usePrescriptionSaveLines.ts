import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { usePrescriptionNumber } from '../../utils/usePrescriptionNumber';
import { usePrescriptionApi } from '../utils/usePrescriptionApi';

export const usePrescriptionSaveLines = () => {
  const prescriptionNumber = usePrescriptionNumber();
  const queryClient = useQueryClient();
  const api = usePrescriptionApi();
  return useMutation(api.updateLines, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.detail(prescriptionNumber));
    },
  });
};
