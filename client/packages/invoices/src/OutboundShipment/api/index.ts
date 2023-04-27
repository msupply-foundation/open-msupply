import { ItemRowFragment } from '@openmsupply-client/system';
import { BarcodeFragment } from './operations.generated';

export {
  OutboundFragment,
  PartialStockLineFragment,
  OutboundLineFragment,
  OutboundRowFragment,
} from './operations.generated';

export * from './hooks';

export type DraftItem = {
  item?: ItemRowFragment;
  barcode?: BarcodeFragment & { batch?: string };
};
