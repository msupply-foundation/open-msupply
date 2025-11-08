import { FilterBy, useQuery } from '@openmsupply-client/common';
import { useItemGraphQL } from '../useItemApi';
import { ITEM_LEDGER } from '../../keys';
import { ItemLedgerFragment } from '../../operations.generated';

export type ItemLedgerListParams = {
  first: number;
  offset: number;
  filterBy?: FilterBy | null;
};

export const useItemLedger = (
  itemId: string,
  queryParams: ItemLedgerListParams
) => {
  const { api, storeId } = useItemGraphQL();

  const queryFn = async (): Promise<{
    ledgers: ItemLedgerFragment[];
    totalCount: number;
  }> => {
    const query = await api.itemLedger({
      storeId,
      first: queryParams.first,
      offset: queryParams.offset,
      filter: {
        ...queryParams.filterBy,
        itemId: { equalTo: itemId },
      },
    });

    const { nodes, totalCount } = query?.itemLedger;
    return {
      ledgers: nodes,
      totalCount,
    };
  };

  return useQuery({
    queryKey: [ITEM_LEDGER, itemId, queryParams],
    queryFn,
    keepPreviousData: true,
  });
};
