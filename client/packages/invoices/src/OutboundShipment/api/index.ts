import { ItemRowFragment } from '@openmsupply-client/system';

export {
  OutboundFragment,
  PartialStockLineFragment,
  OutboundLineFragment,
  OutboundRowFragment,
} from './operations.generated';

export * from './hooks';

export type DraftItem = Pick<ItemRowFragment, 'id' | 'unitName'>;

export type Draft = {
  item?: DraftItem;
  barcode?: { id?: string; value: string; batch?: string };
};
