import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useResponseApi } from '../utils/useResponseApi';
import { useResponseNumber } from '../document/useResponse';

export const useDeleteResponseLine = () => {
  const api = useResponseApi();
  const responseNumber = useResponseNumber();

  const queryClient = useQueryClient();
  const { mutate } = useMutation(api.deleteLine, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(responseNumber)),
  });
  return mutate;
};
