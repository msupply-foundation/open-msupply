import { ItemRowFragment } from 'packages/system/src';

export { default as InvoiceService } from './InvoiceService';
export { useOutbound } from './OutboundShipment/api';
export { useInbound } from './InboundShipment/api';

export type DraftItem = Pick<ItemRowFragment, 'id' | 'unitName'>;

export type Draft = {
  item?: DraftItem;
  barcode?: { id?: string; gtin: string; batch?: string };
};
