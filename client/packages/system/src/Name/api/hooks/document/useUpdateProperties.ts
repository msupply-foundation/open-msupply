import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useUpdateProperties = (nameId: string) => {
  const api = useNameApi();
  const queryClient = useQueryClient();

  return useMutation(api.updateNameProperties, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.detail(nameId)),
  });
};
