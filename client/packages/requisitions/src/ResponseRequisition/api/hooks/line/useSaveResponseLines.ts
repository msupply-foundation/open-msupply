import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useResponseNumber } from '../document/useResponse';
import { useResponseApi } from '../utils/useResponseApi';

export const useSaveResponseLines = () => {
  const responseNumber = useResponseNumber();
  const queryClient = useQueryClient();
  const api = useResponseApi();

  return useMutation(api.updateLine, {
    onSuccess: () =>
      queryClient.invalidateQueries(api.keys.detail(responseNumber)),
  });
};
