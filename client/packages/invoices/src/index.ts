import { ItemRowFragment } from '@openmsupply-client/system';

export { default as InvoiceService } from './InvoiceService';
export { useOutbound } from './OutboundShipment/api';
export { useInbound, InboundFragment } from './InboundShipment/api';

export type DraftItem = Pick<ItemRowFragment, 'id' | 'unitName'>;

export type Draft = {
  item?: DraftItem;
  barcode?: { id?: string; gtin: string; batch?: string };
};
