import { ItemFragment } from './../../operations.generated';
import { useQuery, UseQueryResult } from 'react-query';
import { Item, useQueryParams } from '@openmsupply-client/common';
import { useEffect } from 'react';
import { useItemApi } from './../useItemApi/useItemApi';
import { mapItemNodes } from '../../../utils';
import { ItemQueries } from './../../api';

// TODO: Use itemID to filter when possible.
export const useItem = (itemCode: string): UseQueryResult<Item> => {
  const api = useItemApi();
  const { filterBy, filter, queryParams, first, offset, sortBy, storeId } =
    useQueryParams<ItemFragment>({
      initialSortBy: { key: 'name' },
      initialFilterBy: { code: { equalTo: itemCode } },
    });

  const queryState = useQuery(['item', itemCode, queryParams], async () => {
    const result = await ItemQueries.get.listWithStockLines(api, {
      sortBy,
      filterBy,
      first,
      offset,
      storeId,
    });

    const { nodes, totalCount } = mapItemNodes(result);

    // TODO: This shouldn't be a problem when we are filtering by the item id.
    // when we filter by the item id, we should have an error returned, rather
    // than an empty item connector, in which case the error would be thrown
    // from higher in the call chain.
    if (!totalCount) throw new Error("Couldn't find item");

    return nodes[0] as Item;
  });

  useEffect(() => {
    filter.onChangeStringFilterRule('code', 'equalTo', itemCode);
  }, [itemCode]);

  return queryState;
};
