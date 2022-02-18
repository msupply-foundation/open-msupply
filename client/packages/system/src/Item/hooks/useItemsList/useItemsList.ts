import {
  useOmSupplyApi,
  Item,
  FilterBy,
  useQueryParams,
  SortRule,
  useQuery,
  UseQueryResult,
  useQueryClient,
} from '@openmsupply-client/common';
import { getItemSortField, mapItemNodes } from '../../utils';

export const useItemsList = (initialListParameters: {
  initialFilterBy?: FilterBy;
  initialSortBy: SortRule<Item>;
}): {
  onFilterByCode: (code: string) => void;
  onFilterByName: (name: string) => void;
  prefetchListByName: (name: string) => void;
} & UseQueryResult<{
  nodes: Item[];
  totalCount: number;
}> => {
  const queryClient = useQueryClient();
  const { api } = useOmSupplyApi();
  const { filterBy, filter, queryParams, first, offset, sortBy, storeId } =
    useQueryParams(initialListParameters);

  const queryState = useQuery(
    ['items', 'list', queryParams],
    async () => {
      const result = await api.itemsWithStockLines({
        key: getItemSortField(sortBy.key),
        filter: filterBy,
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
