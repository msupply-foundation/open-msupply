import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useResponseId } from '../document/useResponse';
import { useResponseApi } from '../utils/useResponseApi';

export const useInsertResponseLines = () => {
  const responseId = useResponseId();
  const queryClient = useQueryClient();
  const api = useResponseApi();

  return useMutation(api.insertLine, {
    onSuccess: () =>
      queryClient.invalidateQueries(api.keys.detail(responseId)),
  });
};
