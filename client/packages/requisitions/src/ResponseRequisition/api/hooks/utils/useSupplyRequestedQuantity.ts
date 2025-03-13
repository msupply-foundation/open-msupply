import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useResponseId } from '../document/useResponse';
import { useResponseFields } from '../document/useResponseFields';
import { useResponseApi } from './useResponseApi';

export const useSupplyRequestedQuantity = () => {
  const responseId = useResponseId();
  const queryClient = useQueryClient();
  const { id } = useResponseFields('id');
  const api = useResponseApi();

  return useMutation(() => api.supplyRequestedQuantity(id), {
    onSettled: () => {
      queryClient.invalidateQueries(api.keys.detail(responseId));
    },
  });
};
