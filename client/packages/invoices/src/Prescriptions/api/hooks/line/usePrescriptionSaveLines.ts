import {
  useQueryClient,
  useMutation,
  useNotification,
} from '@openmsupply-client/common';
import { usePrescriptionNumber } from '../../utils/usePrescriptionNumber';
import { usePrescriptionApi } from '../utils/usePrescriptionApi';

export const usePrescriptionSaveLines = () => {
  const prescriptionNumber = usePrescriptionNumber();
  const queryClient = useQueryClient();
  const api = usePrescriptionApi();
  const { error } = useNotification();
  return useMutation(api.updateLines, {
    onSuccess: data => {
      data.batchPrescription.insertPrescriptionLines?.forEach(line => {
        if (line.response.__typename === 'InsertPrescriptionLineError') {
          error(line.response.error.description)();
        }
      });
      data.batchPrescription.updatePrescriptionLines?.forEach(line => {
        if (line.response.__typename === 'UpdatePrescriptionLineError') {
          error(line.response.error.description)();
        }
      });
      queryClient.invalidateQueries(api.keys.detail(prescriptionNumber));
    },
  });
};
