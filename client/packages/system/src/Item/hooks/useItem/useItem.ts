import { useQuery, UseQueryResult } from 'react-query';
import {
  Item,
  useOmSupplyApi,
  useQueryParams,
} from '@openmsupply-client/common';
import { useEffect } from 'react';
import { getItemSortField, mapItemNodes } from '../../utils';

// TODO: Use itemID to filter when possible.
export const useItem = (itemCode: string): UseQueryResult<Item> => {
  const { api } = useOmSupplyApi();
  const { filterBy, filter, queryParams, first, offset, sortBy, storeId } =
    useQueryParams<Item>({
      initialSortBy: { key: 'name' },
      initialFilterBy: { code: { equalTo: itemCode } },
    });

  const queryState = useQuery(['item', itemCode, queryParams], async () => {
    const result = await api.itemsWithStockLines({
      key: getItemSortField(sortBy.key),
      filter: filterBy,
      first,
      offset,
      storeId,
    });

    const { nodes, totalCount } = mapItemNodes(result);

    // TODO: This shouldn't be a problem when we are filtering by the item id.
    // when we filter by the item id, we should have an error returned, rather
    // than an empty item connector, in which case the error would be thrown
    // from a higher in the call chain.
    if (!totalCount) throw new Error("Couldn't find item");

    return nodes[0] as Item;
  });

  useEffect(() => {
    filter.onChangeStringFilterRule('code', 'equalTo', itemCode);
  }, [itemCode]);

  return queryState;
};
