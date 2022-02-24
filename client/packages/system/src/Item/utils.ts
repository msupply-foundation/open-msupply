import { ItemSortFieldInput, Item } from '@openmsupply-client/common';
import { ItemLike } from './types';
import { ItemsWithStockLinesQuery } from './api';

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
  const items = result.items;
  const { totalCount } = items;
  const nodes: Item[] = items.nodes.map(item => {
    return {
      ...item,
      availableQuantity: item.availableBatches.nodes.reduce(
        (sum, batch) =>
          sum +
          (batch.onHold ? 0 : batch.availableNumberOfPacks * batch.packSize),
        0
      ),
      allocatedQuantity: 0,
      unitName: item.unitName ?? '',
    };
  });

  return { nodes, totalCount };
};

export const toItem = (line: ItemLike): Item => ({
  __typename: 'ItemNode',
  id: 'lines' in line ? line.lines[0].itemId : line.itemId,
  name: 'lines' in line ? line.lines[0].itemName : line.itemName,
  code: 'lines' in line ? line.lines[0].itemCode : line.itemCode,
  isVisible: true,
  availableBatches: {
    __typename: 'StockLineConnector',
    nodes: [],
    totalCount: 0,
  },
  availableQuantity: 0,
  stats: {
    __typename: 'ItemStatsNode',
    availableMonthsOfStockOnHand: 0,
    averageMonthlyConsumption: 0,
    availableStockOnHand: 0,
  },
  unitName:
    ('lines' in line ? line.lines[0].item?.unitName : line.item?.unitName) ??
    '',
});
