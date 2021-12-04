import { generateUUID } from '@openmsupply-client/common';

import { StocktakeItem, StocktakeLine } from './../../../../types';

export const createStocktakeRow = (
  stocktakeItem: StocktakeItem,
  seed?: StocktakeLine
): StocktakeLine => {
  const id = generateUUID();
  const row = {
    id,
    batch: '',
    costPricePerPack: 0,
    sellPricePerPack: 0,
    expiryDate: undefined,
    itemId: stocktakeItem.id,
    itemCode: stocktakeItem.itemCode(),
    itemName: stocktakeItem.itemName(),
    snapshotNumPacks: undefined,
    snapshotPackSize: undefined,
    countedNumPacks: undefined,
    isCreated: !seed,
    isUpdated: false,
    isDeleted: false,
    ...seed,
    update: (key: string, value: string) => {
      if (key === 'batch') {
        row.batch = value;
      }
      if (key === 'countedNumPacks') {
        row.countedNumPacks = Number(value);
      }

      if (key === 'costPricePerPack') {
        row.costPricePerPack = Number(value);
      }
      if (key === 'sellPricePerPack') {
        row.sellPricePerPack = Number(value);
      }

      row.isUpdated = true;

      stocktakeItem.upsertLine?.(row);
    },
  };

  return row;
};

export const wrapStocktakeItem = (
  seed: StocktakeItem,
  updater: (item: StocktakeItem | null) => void
): StocktakeItem => {
  const wrapped = {
    ...seed,
    upsertLine: (line: StocktakeLine) => {
      const updatedLines = [...seed.lines];
      const idx = updatedLines.findIndex(l => l.id === line.id);
      if (idx !== -1) {
        updatedLines[idx] = line;
      } else {
        updatedLines.push(line);
      }
      const updatedItem = { ...seed, lines: updatedLines };

      updater(updatedItem);
    },
  };

  const lines = seed.lines.map(batch => createStocktakeRow(wrapped, batch));

  return { ...wrapped, lines };
};
