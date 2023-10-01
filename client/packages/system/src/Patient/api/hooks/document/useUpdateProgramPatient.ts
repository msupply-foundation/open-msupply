import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const useUpdateProgramPatient = () => {
  const queryClient = useQueryClient();
  const api = usePatientApi();
  return useMutation(api.updateProgramPatient, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
