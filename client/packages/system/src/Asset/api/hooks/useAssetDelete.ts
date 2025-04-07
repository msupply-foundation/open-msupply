import { useMutation } from 'packages/common/src';
import { useAssetGraphQL } from '../useAssetGraphQL';
import { ASSET } from './keys';
import { useAssetList } from './useAssetList';
import { useTableStore } from '@openmsupply-client/common';
import { AssetCatalogueItemFragment } from '../operations.generated';

export const useAssetDelete = () => {
  const { assetApi, queryClient } = useAssetGraphQL();
  const {
    query: { data },
  } = useAssetList();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => data?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as AssetCatalogueItemFragment[],
  }));

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

  const deleteAssets = async () => {
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
    selectedRows,
  };
};
