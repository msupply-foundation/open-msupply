import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useRequestApi } from '../utils/useRequestApi';

export const useInsertProgramRequest = () => {
  const queryClient = useQueryClient();
  const api = useRequestApi();
  return useMutation(api.insertProgram, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
