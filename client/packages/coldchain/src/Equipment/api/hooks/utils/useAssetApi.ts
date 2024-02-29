import { getAssetQueries, ListParams } from '../../api';
import { SortBy, useAuthContext, useGql } from '@openmsupply-client/common';
import { getSdk, AssetFragment } from '../../operations.generated';
import { useAssetData } from '@openmsupply-client/system';
import { useMemo } from 'react';

export const useAssetApi = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const { data } = useAssetData.utils.classes();
  const classId =
    data?.nodes?.find(c => c.name === 'Cold chain equipment')?.id ?? '';

  const keys = useMemo(
    () => ({
      base: () => ['asset', classId] as const,
      detail: (id: string) => [...keys.base(), storeId, id] as const,
      list: () => [...keys.base(), storeId, 'list'] as const,
      paramList: (params: ListParams<AssetFragment>) =>
        [...keys.list(), params] as const,
      sortedList: (sortBy: SortBy<AssetFragment>) =>
        [...keys.list(), sortBy] as const,
    }),
    [storeId, classId]
  );

  const queries = getAssetQueries(getSdk(client), storeId, classId);

  return useMemo(
    () => ({ ...queries, storeId, keys }),
    [keys, queries, storeId]
  );
};
