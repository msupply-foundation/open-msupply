import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useResponseId } from '../document/useResponse';
import { useResponseApi } from '../utils/useResponseApi';

export const useSaveResponseLines = () => {
  const responseId = useResponseId();
  const queryClient = useQueryClient();
  const api = useResponseApi();

  return useMutation({
    mutationFn: api.upsertLine,

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: api.keys.detail(responseId)
    })
  });
};
