import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useRequestId } from '../document/useRequest';
import { useRequestApi } from '../utils/useRequestApi';

export const useDeleteRequestLine = () => {
  const api = useRequestApi();
  const requestId = useRequestId();

  const queryClient = useQueryClient();
  const { mutate } = useMutation(api.deleteLine, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(requestId)),
  });
  return mutate;
};
