import {
  useAuthContext,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';
import { AssetCatalogueItemFragment } from '../../operations.generated';

export const useAssetItemInsert = () => {
  const queryClient = useQueryClient();
  const api = useAssetApi();
  const storeId = useAuthContext().storeId;

  const invalidateQueries = () =>
    queryClient.invalidateQueries(api.keys.base());
  const { mutateAsync: insertAssetCatalogueItem } = useMutation(
    async (asset: AssetCatalogueItemFragment) => api.insert(asset, storeId),
    {
      onSettled: () => queryClient.invalidateQueries(api.keys.base()),
      onError: e => {
        console.error(e);
      },
    }
  );

  return { insertAssetCatalogueItem, invalidateQueries };
};
