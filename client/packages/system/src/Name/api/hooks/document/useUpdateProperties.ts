import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useUpdateProperties = (nameId: string) => {
  const api = useNameApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.updateNameProperties,

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: api.keys.detail(nameId)
    })
  });
};
