import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';
import { DraftAsset } from '../../../types';
import { LOCATION } from '@openmsupply-client/system';

export const useAssetUpdate = () => {
  const queryClient = useQueryClient();
  const api = useAssetApi();

  return useMutation(async (asset: Partial<DraftAsset>) => api.update(asset), {
    onSuccess: id => {
      queryClient.invalidateQueries([LOCATION]);
      queryClient.invalidateQueries(api.keys.detail(id));
    },
    onError: e => {
      console.error(e);
    },
  });
};
