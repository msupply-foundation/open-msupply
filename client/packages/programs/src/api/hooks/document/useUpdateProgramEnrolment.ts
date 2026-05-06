import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useProgramEnrolmentApi } from '../utils/useProgramEnrolmentApi';

export const useUpdateProgramEnrolment = () => {
  const queryClient = useQueryClient();
  const api = useProgramEnrolmentApi();
  return useMutation({
    mutationFn: api.updateProgramEnrolment,

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: api.keys.base()
    })
  });
};
