import {
  generateUUID,
  formatDate,
  arrayToRecord,
} from '@openmsupply-client/common';
import { InboundShipmentItem, InboundShipmentRow } from '../../../../types';
import { recalculateSummary } from '../../../../OutboundShipment/DetailView/reducer';
import { Item } from '@openmsupply-client/mock-server/src/data';

export const createInboundShipmentBatch = (
  inboundItem: InboundShipmentItem,
  seed?: InboundShipmentRow
): InboundShipmentRow => {
  const id = generateUUID();
  const row = {
    id,
    numberOfPacks: 0,
    stockLineId: '',
    invoiceId: '',
    itemId: inboundItem.itemId,
    note: '',
    costPricePerPack: 0,
    expiryDate: formatDate(new Date()),
    itemCode: inboundItem.itemCode,
    itemName: inboundItem.itemName,
    packSize: 1,
    sellPricePerPack: 0,
    isCreated: !seed,
    isUpdated: false,
    isDeleted: false,
    ...seed,
    update: (key: string, value: string) => {
      if (key === 'batch') {
        row.batch = value;
      }
      if (key === 'numberOfPacks') {
        row.numberOfPacks = Number(value);
      }
      if (key === 'packSize') {
        row.packSize = Number(value);
      }
      if (key === 'costPricePerPack') {
        row.costPricePerPack = Number(value);
      }
      if (key === 'sellPricePerPack') {
        row.sellPricePerPack = Number(value);
      }

      row.isUpdated = true;

      inboundItem.upsertLine?.(row);
    },
  };

  return row;
};

export const wrapInboundShipmentItem = (
  seed: InboundShipmentItem,
  updater: (item: InboundShipmentItem | null) => void
): InboundShipmentItem => {
  const wrapped = {
    ...seed,
    upsertLine: (row: InboundShipmentRow) => {
      const updatedBatches = { ...seed.batches, [row.id]: row };
      const updatedSeed = { ...seed, batches: updatedBatches };
      const { unitQuantity, numberOfPacks } = recalculateSummary(updatedSeed);

      updater({ ...updatedSeed, unitQuantity, numberOfPacks });
    },
  };

  const batches = arrayToRecord(
    Object.values(seed.batches).map(batch =>
      createInboundShipmentBatch(wrapped, batch)
    )
  );

  return { ...wrapped, batches };
};

export const itemToSummaryItem = (item: Item): InboundShipmentItem => {
  return {
    id: item.id,
    itemId: item.id,
    itemName: item.name,
    itemCode: item.code,
    batches: {},
    unitQuantity: 0,
    numberOfPacks: 0,
  };
};
