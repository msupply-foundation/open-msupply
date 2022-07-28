import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useProgramEnrolmentApi } from '../utils/useProgramEnrolmentApi';

export const useUpdateProgramEnrolment = () => {
  const queryClient = useQueryClient();
  const api = useProgramEnrolmentApi();
  return useMutation(api.updateProgram, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
