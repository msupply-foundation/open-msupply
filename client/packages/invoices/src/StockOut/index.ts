import { GetOutboundEditLinesQuery } from '../OutboundShipment/api/operations.generated';

export {
  StockOutLineFragment,
  PartialStockLineFragment,
} from './operations.generated';
export * from './hooks';
export * from './utils';

export type DraftItem = GetOutboundEditLinesQuery['items']['nodes'][number];

export type Draft = {
  item?: DraftItem;
  barcode?: { id?: string; gtin: string; batch?: string };
};

export * from './Components';
