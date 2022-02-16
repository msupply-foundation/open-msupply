import {
  ConnectorError,
  StockLineConnector,
  ItemSortFieldInput,
  ItemsWithStockLinesQuery,
  StockLineNode,
  ItemNode,
  Item,
} from '@openmsupply-client/common';
import { ItemLike } from './types';

export const itemsGuard = (
  itemsQuery: ItemsWithStockLinesQuery
): { nodes: ItemNode[]; totalCount: number } => {
  if (itemsQuery.items.__typename === 'ItemConnector') {
    // TODO:
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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

export const mapItemNodes = (
  result: ItemsWithStockLinesQuery
): {
  nodes: Item[];
  totalCount: number;
} => {
  const items = itemsGuard(result);
  const { totalCount } = items;
  const nodes: Item[] = items.nodes.map(item => {
    const availableBatches = availableBatchesGuard(item.availableBatches);
    return {
      ...item,
      availableQuantity: availableBatches.reduce(
        (sum, batch) =>
          sum +
          (batch.onHold ? 0 : batch.availableNumberOfPacks * batch.packSize),
        0
      ),
      allocatedQuantity: 0,
      unitName: item.unitName ?? '',
      availableBatches,
    };
  });

  return { nodes, totalCount };
};

export const toItem = (line: ItemLike): Item => ({
  id: 'lines' in line ? line.lines[0].itemId : line.itemId,
  name: 'lines' in line ? line.lines[0].itemName : line.itemName,
  code: 'lines' in line ? line.lines[0].itemCode : line.itemCode,
  isVisible: true,
  availableBatches: [],
  availableQuantity: 0,
  stats: {
    monthsOfStock: 0,
    averageMonthlyConsumption: 0,
    stockOnHand: 0,
  },
  unitName:
    ('lines' in line ? line.lines[0].item?.unitName : line.item?.unitName) ??
    '',
});
