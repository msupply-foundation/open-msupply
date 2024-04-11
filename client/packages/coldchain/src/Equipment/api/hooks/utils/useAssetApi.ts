import { getAssetQueries, ListParams } from '../../api';
import { SortBy, useAuthContext, useGql } from '@openmsupply-client/common';
import { getSdk, AssetFragment } from '../../operations.generated';

export const useAssetApi = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['asset'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams<AssetFragment>) =>
      [...keys.list(), params] as const,
    sortedList: (sortBy: SortBy<AssetFragment>) =>
      [...keys.list(), sortBy] as const,
    logs: (assetId: string) => [...keys.base(), assetId, 'logs'] as const,
    logReasons: () => [...keys.base(), 'logReasons'] as const,
    labelPrinterSettings: () => ['host', 'labelPrinterSettings'] as const,
  };

  const queries = getAssetQueries(getSdk(client), storeId);
  return { ...queries, storeId, keys };
};
