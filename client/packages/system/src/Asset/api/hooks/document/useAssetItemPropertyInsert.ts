import {
  useAuthContext,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';
import { AssetProperty } from '../../api';

export const useAssetItemPropertyInsert = () => {
  const queryClient = useQueryClient();
  const api = useAssetApi();
  const storeId = useAuthContext().storeId;

  const invalidateQueries = () =>
    queryClient.invalidateQueries(api.keys.base());

  const { mutateAsync: insertAssetCatalogueItemProperty } = useMutation(
    async ({
      catalogueItemId,
      property,
    }: {
      catalogueItemId: string;
      property: AssetProperty;
    }) => api.insertProperty(catalogueItemId, property, storeId),
    {
      onError: e => {
        console.error(e);
      },
    }
  );

  return { invalidateQueries, insertAssetCatalogueItemProperty };
};
