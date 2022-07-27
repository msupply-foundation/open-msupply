import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { usePatientEnrolmentApi } from '../utils/useProgramEnrolmentApi';

export const useUpdateProgramEnrolment = () => {
  const queryClient = useQueryClient();
  const api = usePatientEnrolmentApi();
  return useMutation(api.updateProgram, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
