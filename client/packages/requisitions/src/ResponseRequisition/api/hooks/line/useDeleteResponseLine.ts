import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useResponseId } from '../document/useResponse';
import { useResponseApi } from '../utils/useResponseApi';

export const useDeleteResponseLine = () => {
  const api = useResponseApi();
  const responseId = useResponseId();

  const queryClient = useQueryClient();
  const { mutate } = useMutation(api.deleteLine, {
    onSettled: () => queryClient.invalidateQueries(api.keys.detail(responseId)),
  });
  return mutate;
};
