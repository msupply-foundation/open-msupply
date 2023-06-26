import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  const api = usePatientApi();
  return useMutation(api.updatePatient, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
