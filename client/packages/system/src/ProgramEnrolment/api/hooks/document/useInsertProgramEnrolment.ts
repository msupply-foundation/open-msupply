import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { usePatientEnrolmentApi } from '../utils/useProgramEnrolmentApi';

export const useInsertProgramEnrolment = () => {
  const queryClient = useQueryClient();
  const api = usePatientEnrolmentApi();
  return useMutation(api.insertProgram, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
