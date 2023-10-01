import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { usePrescriptionApi } from '../../utils/usePrescriptionApi';

export const usePrescriptionUpdate = () => {
  const queryClient = useQueryClient();
  const api = usePrescriptionApi();
  return useMutation(api.update, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
