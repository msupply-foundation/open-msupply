import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';
import { DraftAsset } from '../../../types';
import { useLocationApi } from '@openmsupply-client/system/src/Location/api/hooks/utils/useLocationApi';

export const useAssetUpdate = () => {
  const queryClient = useQueryClient();
  const api = useAssetApi();
  const locationApi = useLocationApi();

  return useMutation(async (asset: Partial<DraftAsset>) => api.update(asset), {
    onSuccess: id => {
      queryClient.invalidateQueries(locationApi.keys.list());
      queryClient.invalidateQueries(api.keys.detail(id));
    },
    onError: e => {
      console.error(e);
    },
  });
};
