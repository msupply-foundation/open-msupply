import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useProgramEnrolmentApi } from '../utils/useProgramEnrolmentApi';

export const useInsertProgramEnrolment = () => {
  const queryClient = useQueryClient();
  const api = useProgramEnrolmentApi();
  return useMutation(api.insertProgramEnrolment, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
