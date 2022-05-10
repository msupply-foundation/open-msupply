import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useRequestNumber } from '../document/useRequest';
import { useRequestApi } from '../utils/useRequestApi';

export const useSaveRequestLines = () => {
  const requestNumber = useRequestNumber();
  const queryClient = useQueryClient();
  const api = useRequestApi();

  return useMutation(api.upsertLine, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.detail(requestNumber));
    },
  });
};
