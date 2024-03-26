import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';
import { AssetFragment } from '../../operations.generated';
import { LocationIds } from '../../../DetailView';

export const useAssetUpdate = () => {
  const queryClient = useQueryClient();
  const api = useAssetApi();

  return useMutation(
    async (asset: Partial<AssetFragment & LocationIds>) => api.update(asset),
    {
      onSuccess: id => queryClient.invalidateQueries(api.keys.detail(id)),
      onError: e => {
        console.error(e);
      },
    }
  );
};
