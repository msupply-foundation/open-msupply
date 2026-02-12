import { useMutation } from '@openmsupply-client/common';
import { useAssetGraphQL } from '../useAssetGraphQL';
import { ASSET } from './keys';
import { AssetCatalogueItemFragment } from '../operations.generated';

export const useAssetDelete = () => {
  const { assetApi, queryClient } = useAssetGraphQL();

  const mutationFn = async (id: string) => {
    const result = await assetApi.deleteAssetCatalogueItem({
      assetCatalogueItemId: id,
    });

    return result.centralServer.assetCatalogue.deleteAssetCatalogueItem;
  };

  const {
    mutateAsync: deleteMutation,
    isLoading,
    error,
  } = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([ASSET]);
    },
  });

  const deleteAssets = async (selectedRows: AssetCatalogueItemFragment[]) => {
    await Promise.all(selectedRows.map(row => deleteMutation(row.id))).catch(
      err => {
        console.error(err);
        throw err;
      }
    );
  };

  return {
    deleteAssets,
    isLoading,
    error,
  };
};
