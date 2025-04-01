import { AssetCatalogueItemFragment } from '../operations.generated';
import {
  AssetCatalogueItemSortFieldInput,
  FilterByWithBoolean,
  LIST,
  SortBy,
  useQuery,
} from '@openmsupply-client/common';
import { useAssetGraphQL } from '../useAssetGraphQL';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<AssetCatalogueItemFragment>;
  filterBy?: FilterByWithBoolean | null;
};

export const useAssetList = (queryParams?: ListParams) => {
  const { assetApi, storeId } = useAssetGraphQL();
  const { first, offset, sortBy, filterBy } = queryParams ?? {};
  const queryKey = ['asset', storeId, LIST, first, offset, sortBy, filterBy];

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
