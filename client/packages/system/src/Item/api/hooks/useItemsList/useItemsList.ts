import {
  Item,
  FilterBy,
  useQueryParams,
  SortRule,
  useQuery,
  UseQueryResult,
  useQueryClient,
} from '@openmsupply-client/common';
import { useItemApi } from './../useItemApi';
import { getItemSortField, mapItemNodes } from '../../../utils';
import { ItemFragment } from './../../operations.generated';
import { ItemQueries } from './../../api';

export const useItemsList = (initialListParameters: {
  initialFilterBy?: FilterBy;
  initialSortBy: SortRule<ItemFragment>;
}): {
  onFilterByCode: (code: string) => void;
  onFilterByName: (name: string) => void;
  prefetchListByName: (name: string) => void;
} & UseQueryResult<{
  nodes: Item[];
  totalCount: number;
}> => {
  const queryClient = useQueryClient();
  const api = useItemApi();
  const { filterBy, filter, queryParams, first, offset, sortBy, storeId } =
    useQueryParams(initialListParameters);

  const queryState = useQuery(
    ['item', 'list', queryParams],
    async () => {
      const result = await ItemQueries.get.listWithStockLines(api, {
        sortBy,
        filterBy,
        first,
        offset,
        storeId,
      });

      return mapItemNodes(result);
    },
    {
      keepPreviousData: true,
    }
  );

  const prefetchListByName = async (name: string) => {
    const prefetchQueryParams = {
      ...queryParams,
      filterBy: { name: { like: name } },
    };
    await queryClient.prefetchQuery(
      ['items', 'list', prefetchQueryParams],
      () =>
        api.itemsWithStockLines({
          key: getItemSortField(queryParams.sortBy.key),
          filter: prefetchQueryParams.filterBy,
          first: prefetchQueryParams.pagination.first,
          offset: prefetchQueryParams.pagination.offset,
          storeId,
        })
    );
  };

  const onFilterByCode = (code: string) => {
    filter.onChangeStringFilterRule('code', 'like', code);
  };

  const onFilterByName = (name: string) => {
    filter.onChangeStringFilterRule('name', 'like', name);
  };

  return { ...queryState, onFilterByCode, onFilterByName, prefetchListByName };
};
