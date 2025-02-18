import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const useUpdateInsurance = () => {
  const queryClient = useQueryClient();
  const api = usePatientApi();
  return useMutation(api.updateInsurance, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
