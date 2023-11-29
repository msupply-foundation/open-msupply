import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';
import { VariantFragment } from '../../operations.generated';

export const usePackVariantInsert = () => {
  const queryClient = useQueryClient();
  const api = useItemApi();

  return useMutation(
    async (packVariant: VariantFragment) => api.insertPackVariant(packVariant),
    {
      onSettled: () => queryClient.invalidateQueries(api.keys.packVariants()),
    }
  );
};
