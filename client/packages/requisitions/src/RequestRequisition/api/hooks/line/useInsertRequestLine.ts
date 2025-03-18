import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useRequestId } from '../document/useRequest';
import { useRequestApi } from '../utils/useRequestApi';

export const useInsertRequestLines = () => {
  const requestId = useRequestId();
  const queryClient = useQueryClient();
  const api = useRequestApi();

  return useMutation(api.insertLine, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.detail(requestId)),
  });
};
