import { useMutation } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';
import { DraftAsset } from '../../../types';

export const useAssetInsert = () => {
  const api = useAssetApi();

  return useMutation({
    mutationFn: async (asset: Partial<DraftAsset>) => api.insert(asset),

    onError: e => {
      console.error(e);
    }
  });
};
