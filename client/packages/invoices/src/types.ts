import { InboundLineFragment } from './InboundShipment/api';
import {
  CustomerReturnLineFragment,
  SupplierReturnLineFragment,
} from './Returns';
import { StockOutLineFragment } from './StockOut/operations.generated';

export interface DraftInboundLine extends InboundLineFragment {
  isCreated?: boolean;
  isDeleted?: boolean;
  isUpdated?: boolean;
}

export interface DraftStockOutLine extends StockOutLineFragment {
  isCreated?: boolean;
  isUpdated?: boolean;
  isDeleted?: boolean;
}

export type InboundItem = {
  id: string;
  itemId: string;
  lines: InboundLineFragment[];
};

export type StockOutItem = {
  id: string;
  itemId: string;
  lines: StockOutLineFragment[];
};

export type CustomerReturnItem = {
  id: string;
  itemId: string;
  lines: CustomerReturnLineFragment[];
};

export type SupplierReturnItem = {
  id: string;
  itemId: string;
  lines: SupplierReturnLineFragment[];
};
