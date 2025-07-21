import { useMutation } from '@openmsupply-client/common';
import { useRnRGraphQL } from '../useRnRGraphQL';

export const useDeleteRnRForm = () => {
  const { api, storeId } = useRnRGraphQL();
  const { mutateAsync, isLoading, error } = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.deleteRnRForm({
        storeId,
        input: { id },
      });
      return response;
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
