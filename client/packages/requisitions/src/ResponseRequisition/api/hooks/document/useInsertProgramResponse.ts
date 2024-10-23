import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useResponseApi } from '../utils/useResponseApi';

export const useInsertProgramResponse = () => {
  const queryClient = useQueryClient();
  const api = useResponseApi();
  return useMutation(api.insertProgram, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
