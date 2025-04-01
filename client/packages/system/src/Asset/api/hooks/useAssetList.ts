import { AssetCatalogueItemFragment } from '../operations.generated';
import {
  AssetCatalogueItemSortFieldInput,
  FilterByWithBoolean,
  LIST,
  SortBy,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useTableStore,
} from '@openmsupply-client/common';
import { useAssetGraphQL } from '../useAssetGraphQL';
import { ASSET } from './keys';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<AssetCatalogueItemFragment>;
  filterBy?: FilterByWithBoolean | null;
};

export type useAssetsProps = {
  categoryId?: string;
  queryParams?: ListParams;
  rowsPerPage: number;
};

export const useAssetList = (queryParams?: ListParams) => {
  const { data, isLoading, isError } = getList(queryParams);

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => data?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as AssetCatalogueItemFragment[],
  }));

  const {
    mutateAsync: deleteMutation,
    isLoading: isDeleting,
    error: deleteError,
  } = useDelete();

  const deleteAssets = async () => {
    await Promise.all(selectedRows.map(row => deleteMutation(row.id))).catch(
      err => {
        console.error(err);
        throw err;
      }
    );
  };

  return {
    query: { data, isLoading, isError },
    delete: {
      deleteAssets,
      isDeleting,
      deleteError,
    },
    selectedRows,
  };
};

export const useInfiniteAssets = ({
  categoryId,
  queryParams,
  rowsPerPage,
}: useAssetsProps) => {
  const { assetApi, storeId } = useAssetGraphQL();
  const queryKey = [ASSET, storeId, LIST, categoryId, queryParams, rowsPerPage];

  const filter =
    categoryId === undefined
      ? queryParams?.filterBy
      : { ...queryParams?.filterBy, categoryId: { equalTo: categoryId } };

  const params = { ...queryParams, filter };
  const queryFn = async ({ pageParam = 0 }) => {
    const pageNumber = Number(pageParam);
    const { assetCatalogueItems } = await assetApi.assetCatalogueItems({
      ...params,
      first: rowsPerPage,
      offset: rowsPerPage * pageNumber,
      key: AssetCatalogueItemSortFieldInput.Catalogue,
    });

    return {
      data: assetCatalogueItems ?? [],
      pageNumber,
    };
  };

  const infiniteQuery = useInfiniteQuery({
    queryKey,
    queryFn,
  });
  return infiniteQuery;
};

export const getList = (queryParams?: ListParams) => {
  const { assetApi, storeId } = useAssetGraphQL();
  const { first, offset, sortBy, filterBy } = queryParams ?? {};
  const queryKey = [ASSET, storeId, LIST, first, offset, sortBy, filterBy];

  const queryFn = async () => {
    const query = await assetApi.assetCatalogueItems({
      first: first ?? 1000,
      offset: offset ?? 0,
      key: toSortField(sortBy),
      desc: sortBy?.isDesc,
      filter: filterBy,
    });
    const { nodes, totalCount } = query?.assetCatalogueItems;
    return { nodes, totalCount };
  };

  const query = useQuery({
    queryKey,
    queryFn,
  });
  return query;
};

export const useDelete = () => {
  const { assetApi, queryClient } = useAssetGraphQL();
  const mutationFn = async (id: string) => {
    const result = await assetApi.deleteAssetCatalogueItem({
      assetCatalogueItemId: id,
    });

    return result.centralServer.assetCatalogue.deleteAssetCatalogueItem;
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([ASSET]);
    },
  });
};

const toSortField = (sortBy?: SortBy<AssetCatalogueItemFragment>) => {
  switch (sortBy?.key) {
    case 'catalogue':
      return AssetCatalogueItemSortFieldInput.Catalogue;
    case 'code':
      return AssetCatalogueItemSortFieldInput.Code;
    case 'make':
      return AssetCatalogueItemSortFieldInput.Manufacturer;
    case 'model':
      return AssetCatalogueItemSortFieldInput.Model;
    default:
      return AssetCatalogueItemSortFieldInput.Manufacturer;
  }
};
