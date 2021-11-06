import { ItemSortFieldInput } from '@openmsupply-client/common/src/types/schema';
import {
  useOmSupplyApi,
  ItemsWithStockLinesQuery,
  Item,
  StockLineConnector,
  ConnectorError,
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

export const useItems = (): UseQueryResult<{
  nodes: Item[];
  totalCount: number;
}> => {
  const { api } = useOmSupplyApi();
  return useQuery(['items', 'list'], async () => {
    const result = await api.itemsWithStockLines({
      key: ItemSortFieldInput.Name,
    });

    const items = itemsGuard(result);

    const nodes: Item[] = items.nodes.map(item => ({
      ...item,
      availableBatches: availableBatchesGuard(item.availableBatches),
    }));

    return { totalCount: items.totalCount, nodes };
  });
};
