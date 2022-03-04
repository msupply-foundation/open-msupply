import {
  ItemNode,
  FilterBy,
  useQueryParams,
  SortRule,
  useQuery,
  UseQueryResult,
  useQueryClient,
} from '@openmsupply-client/common';
import { useItemApi } from './../useItemApi';
import { ItemFragment } from './../../operations.generated';

export const useItemsList = (initialListParameters: {
  initialFilterBy?: FilterBy;
  initialSortBy: SortRule<ItemFragment>;
}): {
  onFilterByCode: (code: string) => void;
  onFilterByName: (name: string) => void;
  prefetchListByName: (name: string) => void;
} & UseQueryResult<{
  nodes: ItemNode[];
  totalCount: number;
}> => {
  const queryClient = useQueryClient();
  const api = useItemApi();
  const { filterBy, filter, queryParams, first, offset, sortBy } =
    useQueryParams(initialListParameters);

  const queryState = useQuery(
    api.keys.paramList(queryParams),
    async () => {
      const result = await api.get.listWithStockLines({
        sortBy,
        filterBy,
        first,
        offset,
      });

      return result.items;
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
        api.get.listWithStockLines({
          sortBy,
          filterBy: prefetchQueryParams.filterBy,
          first: prefetchQueryParams.pagination.first,
          offset: prefetchQueryParams.pagination.offset,
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
