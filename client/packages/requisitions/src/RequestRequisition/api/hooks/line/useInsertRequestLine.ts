import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useRequestNumber } from '../document/useRequest';
import { useRequestApi } from '../utils/useRequestApi';

export const useInsertRequestLines = () => {
  const RequestNumber = useRequestNumber();
  const queryClient = useQueryClient();
  const api = useRequestApi();

  return useMutation(api.insertLine, {
    onSuccess: () =>
      queryClient.invalidateQueries(api.keys.detail(RequestNumber)),
  });
};
