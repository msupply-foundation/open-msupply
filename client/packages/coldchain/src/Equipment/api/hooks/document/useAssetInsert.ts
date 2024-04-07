import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';
import { AssetFragment } from '../../operations.generated';
import { LocationIds } from '../../../DetailView';

export const useAssetInsert = () => {
  const queryClient = useQueryClient();
  const api = useAssetApi();

  return useMutation(
    async (asset: Partial<AssetFragment & LocationIds>) => api.insert(asset),
    {
      onSettled: () => queryClient.invalidateQueries(api.keys.base()),
      onError: e => {
        console.error(e);
      },
    }
  );
};
