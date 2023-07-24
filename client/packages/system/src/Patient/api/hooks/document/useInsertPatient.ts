import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const useInsertPatient = () => {
  const queryClient = useQueryClient();
  const api = usePatientApi();
  return useMutation(api.insertPatient, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
