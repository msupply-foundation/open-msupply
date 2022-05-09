import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useRequestNumber } from '../document/useRequest';
import { useRequestFields } from '../document/useRequestFields';
import { useRequestApi } from './useRequestApi';

export const useSuggestedQuantity = () => {
  const queryClient = useQueryClient();
  const api = useRequestApi();
  const requestNumber = useRequestNumber();
  const { id } = useRequestFields('id');

  return useMutation(() => api.useSuggestedQuantity(id), {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(requestNumber)),
  });
};
