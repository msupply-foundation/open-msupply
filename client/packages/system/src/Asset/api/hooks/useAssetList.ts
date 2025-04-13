import { AssetCatalogueItemFragment } from '../operations.generated';
import {
  AssetCatalogueItemSortFieldInput,
  FilterByWithBoolean,
  LIST_KEY,
  SortBy,
  useInfiniteQuery,
  useQuery,
} from '@openmsupply-client/common';
import { useAssetGraphQL } from '../useAssetGraphQL';
import { ASSET } from './keys';

type ListParams = {
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
  const { assetApi, storeId } = useAssetGraphQL();
  const { first, offset, sortBy, filterBy } = queryParams ?? {};
  const queryKey = [ASSET, storeId, LIST_KEY, first, offset, sortBy, filterBy];

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

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn,
  });

  return {
    query: { data, isLoading, isError },
  };
};

export const useInfiniteAssets = ({
  categoryId,
  queryParams,
  rowsPerPage,
}: useAssetsProps) => {
  const { assetApi, storeId } = useAssetGraphQL();
  const queryKey = [
    ASSET,
    storeId,
    LIST_KEY,
    categoryId,
    queryParams,
    rowsPerPage,
  ];

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
