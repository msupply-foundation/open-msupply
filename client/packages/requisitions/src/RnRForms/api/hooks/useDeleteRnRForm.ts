import { useMutation } from '@openmsupply-client/common';
import { useRnRGraphQL } from '../useRnRGraphQL';
import { LIST, RNR_FORM } from './keys';

export const useDeleteRnRForm = () => {
  const { api, storeId, queryClient } = useRnRGraphQL();
  const { mutateAsync, isLoading, error } = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.deleteRnRForm({
        storeId,
        input: { id },
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries([RNR_FORM, LIST]);
    },
  });

  const deleteRnRForms = async (ids: string[]) => {
    await Promise.all(ids.map(id => mutateAsync(id)));
  };

  return {
    deleteRnRForms,
    isLoading,
    error,
  };
};
