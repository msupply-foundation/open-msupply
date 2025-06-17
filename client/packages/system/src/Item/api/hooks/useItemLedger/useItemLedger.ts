import { useQuery } from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';
import { ItemLedgerListParams } from '../../api';

export const useItemLedger = (
  itemId: string,
  queryParams: ItemLedgerListParams
) => {
  const api = useItemApi();
  return useQuery(api.keys.itemLedgerParamList(itemId, queryParams), () =>
    api.itemLedger(itemId, queryParams)
  );
};
