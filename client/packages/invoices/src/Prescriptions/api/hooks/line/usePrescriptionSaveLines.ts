import {
  useQueryClient,
  useMutation,
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import { usePrescriptionNumber } from '../../utils/usePrescriptionNumber';
import { usePrescriptionApi } from '../utils/usePrescriptionApi';

export const usePrescriptionSaveLines = (status: InvoiceNodeStatus) => {
  const prescriptionNumber = usePrescriptionNumber();
  const queryClient = useQueryClient();
  const api = usePrescriptionApi();
  return useMutation(api.updateLines(status), {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.detail(prescriptionNumber));
    },
  });
};
