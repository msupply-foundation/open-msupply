import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { usePrescriptionApi } from '../../utils/usePrescriptionApi';

export const usePrescriptionInsert = () => {
  const queryClient = useQueryClient();
  const api = usePrescriptionApi();
  return useMutation(api.insert, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
