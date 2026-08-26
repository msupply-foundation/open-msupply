import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useProgramEnrolmentApi } from '../utils/useProgramEnrolmentApi';

export const useInsertProgramEnrolment = () => {
  const queryClient = useQueryClient();
  const api = useProgramEnrolmentApi();
  return useMutation({
    mutationFn: api.insertProgramEnrolment,

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: api.keys.base()
    })
  });
};
