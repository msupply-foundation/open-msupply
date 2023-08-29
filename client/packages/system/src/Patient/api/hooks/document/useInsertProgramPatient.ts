import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const useInsertProgramPatient = () => {
  const queryClient = useQueryClient();
  const api = usePatientApi();
  return useMutation(api.insertProgramPatient, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
