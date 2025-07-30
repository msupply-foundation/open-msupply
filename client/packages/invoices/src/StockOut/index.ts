import { GetOutboundEditLinesQuery } from './api/operations.generated';

export {
  StockOutLineFragment,
  DraftStockOutLineFragment,
} from './api/operations.generated';

export type DraftItem = GetOutboundEditLinesQuery['items']['nodes'][number];

export type Draft = {
  item?: DraftItem;
  barcode?: { id?: string; gtin: string; batch?: string };
};

export * from './Components';
export * from './utils';
export * from './useAllocationContext';
export * from './api/useStockOutLineEditData';
