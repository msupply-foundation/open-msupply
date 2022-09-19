import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useRequestNumber } from '../document/useRequest';
import { useRequestApi } from '../utils/useRequestApi';

export const useDeleteRequestLine = () => {
  const api = useRequestApi();
  const requestNumber = useRequestNumber();

  const queryClient = useQueryClient();
  const { mutate } = useMutation(api.deleteLine, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(requestNumber)),
  });
  return mutate;
};
