import {
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';
import { usePrescriptionApi } from '../utils/usePrescriptionApi';

export const usePrescriptionDelete = () => {
  const queryClient = useQueryClient();
  const api = usePrescriptionApi();

  return useMutation(api.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
