import { getAssetQueries, ListParams } from '../../api';
import {
  AssetPropertyFilterInput,
  AssetTypeFilterInput,
  SortBy,
  useAuthContext,
  useGql,
} from '@openmsupply-client/common';
import {
  getSdk,
  AssetCatalogueItemFragment,
  AssetLogReasonFragment,
} from '../../operations.generated';

export const useAssetApi = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();

  const keys = {
    base: () => ['asset'] as const,
    detail: (id: string) => [...keys.base(), id] as const,
    list: () => [...keys.base(), 'list'] as const,
    paramList: (params: ListParams<AssetCatalogueItemFragment>) =>
      [...keys.list(), params] as const,
    sortedList: (sortBy: SortBy<AssetCatalogueItemFragment>) =>
      [...keys.list(), sortBy] as const,
    logReasons: () => ['log reasons'] as const,
    logReasonsList: (params: ListParams<AssetLogReasonFragment>) =>
      [...keys.logReasons(), params] as const,
    categories: () => [...keys.base(), 'categories'] as const,
    classes: () => [...keys.base(), 'classes'] as const,
    types: (filter?: AssetTypeFilterInput) =>
      [...keys.base(), filter, 'types'] as const,
    properties: (filter?: AssetPropertyFilterInput) =>
      [filter, 'properties'] as const,
  };

  const queries = getAssetQueries(getSdk(client), storeId);
  return { ...queries, keys };
};
