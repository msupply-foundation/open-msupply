import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';
import { DraftAsset } from '../../../types';

export const useAssetInsert = () => {
  const queryClient = useQueryClient();
  const api = useAssetApi();

  return useMutation(async (asset: Partial<DraftAsset>) => api.insert(asset), {
    onSettled: () => queryClient.invalidateQueries(api.keys.base()),
    onError: e => {
      console.error(e);
    },
  });
};
