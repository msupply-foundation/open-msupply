import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';

export const useItemLedger = (itemId: string) => {
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'datetime', dir: 'desc' },
  });
  const api = useItemApi();
  return useQuery(api.keys.paramList(queryParams), () =>
    api.itemLedger(itemId, queryParams)
  );
};
