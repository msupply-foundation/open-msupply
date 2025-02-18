import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const useInsertInsurance = () => {
  const queryClient = useQueryClient();
  const api = usePatientApi();
  return useMutation(api.insertInsurance, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
