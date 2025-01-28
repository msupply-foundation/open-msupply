import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';
import { VariantFragment } from '../../operations.generated';

export const usePackVariantDelete = () => {
  const queryClient = useQueryClient();
  const api = useItemApi();

  return useMutation(
    async (packVariant: VariantFragment) => api.deletePackVariant(packVariant),
    {
      onSettled: () => queryClient.invalidateQueries(api.keys.packVariants()),
    }
  );
};
