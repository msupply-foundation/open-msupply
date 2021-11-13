import { ItemSortFieldInput } from '@openmsupply-client/common/src/types/schema';
import {
  useOmSupplyApi,
  ItemsWithStockLinesQuery,
  Item,
  StockLineConnector,
  ConnectorError,
  FilterBy,
  useFilterBy,
} from '@openmsupply-client/common';
import { useQuery, UseQueryResult } from 'react-query';

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

export const useItems = (
  initialFilter?: FilterBy<Item> | null
): UseQueryResult<{
  nodes: Item[];
  totalCount: number;
  onFilterByCode: (code: string) => void;
}> => {
  const { api } = useOmSupplyApi();
  const filter = useFilterBy<Item>(initialFilter);

  return useQuery(['items', 'list', filter.filterBy], async () => {
    const result = await api.itemsWithStockLines({
      key: ItemSortFieldInput.Name,
      filter: filter.filterBy,
    });

    const items = itemsGuard(result);

    const nodes: Item[] = items.nodes.map(item => ({
      ...item,
      unitName: item.unitName ?? '',
      availableBatches: availableBatchesGuard(item.availableBatches),
    }));

    const onFilterByCode = (code: string) => {
      filter.onChangeStringFilterRule('code', 'equalTo', code);
    };

    return { totalCount: items.totalCount, nodes, onFilterByCode };
  });
};
