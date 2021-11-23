import {
  ConnectorError,
  StockLineConnector,
  ItemSortFieldInput,
  ItemsWithStockLinesQuery,
  StockLineNode,
  ItemNode,
} from '@openmsupply-client/common';

export const itemsGuard = (
  itemsQuery: ItemsWithStockLinesQuery
): { nodes: ItemNode[]; totalCount: number } => {
  if (itemsQuery.items.__typename === 'ItemConnector') {
    return itemsQuery.items;
  } else {
    throw new Error(itemsQuery.items.error.description);
  }
};

export const availableBatchesGuard = (
  availableBatches: StockLineConnector | ConnectorError
): StockLineNode[] => {
  if (availableBatches.__typename === 'StockLineConnector') {
    return availableBatches.nodes;
  } else if (availableBatches.__typename === 'ConnectorError') {
    throw new Error(availableBatches.error.description);
  }

  throw new Error('Unknown');
};

export const getItemSortField = (sortField: string): ItemSortFieldInput => {
  if (sortField === 'name') return ItemSortFieldInput.Name;
  return ItemSortFieldInput.Code;
};
