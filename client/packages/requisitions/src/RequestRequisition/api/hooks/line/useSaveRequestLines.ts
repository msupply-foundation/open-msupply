import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useRequestId } from '../document/useRequest';
import { useRequestApi } from '../utils/useRequestApi';

export const useSaveRequestLines = () => {
  const requestId = useRequestId();
  const queryClient = useQueryClient();
  const api = useRequestApi();

  return useMutation({
    mutationFn: api.upsertLine,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: api.keys.detail(requestId)
      });
    }
  });
};
