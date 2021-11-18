import {
  useOmSupplyApi,
  ItemsWithStockLinesQuery,
  Item,
  StockLineConnector,
  ConnectorError,
  FilterBy,
  ItemSortFieldInput,
  useQueryParams,
  SortRule,
  useQuery,
  UseQueryResult,
  useQueryClient,
} from '@openmsupply-client/common';

const itemsGuard = (itemsQuery: ItemsWithStockLinesQuery) => {
  if (itemsQuery.items.__typename === 'ItemConnector') {
    return itemsQuery.items;
  } else {
    throw new Error(itemsQuery.items.error.description);
  }
};

const availableBatchesGuard = (
  availableBatches: StockLineConnector | ConnectorError
) => {
  if (availableBatches.__typename === 'StockLineConnector') {
    return availableBatches.nodes;
  } else if (availableBatches.__typename === 'ConnectorError') {
    throw new Error(availableBatches.error.description);
  }

  throw new Error('Unknown');
};

const getItemSortField = (sortField: keyof Item): ItemSortFieldInput => {
  if (sortField === 'name') return ItemSortFieldInput.Name;
  return ItemSortFieldInput.Code;
};

export const useItemsList = (initialListParameters: {
  initialFilterBy?: FilterBy<Item>;
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
  const { filterBy, filter, queryParams, first, offset, sortBy } =
    useQueryParams(initialListParameters);

  const queryState = useQuery(
    ['items', 'list', queryParams],
    async () => {
      const result = await api.itemsWithStockLines({
        key: getItemSortField(sortBy.key),
        filter: filterBy,
        first,
        offset,
      });

      const items = itemsGuard(result);

      const nodes: Item[] = items.nodes.map(item => ({
        ...item,
        unitName: item.unitName ?? '',
        availableBatches: availableBatchesGuard(item.availableBatches),
      }));

      return { totalCount: items.totalCount, nodes };
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
