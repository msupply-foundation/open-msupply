import { InboundLineFragment } from './InboundShipment/api';
import {
  InboundReturnLineFragment,
  OutboundReturnLineFragment,
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

export type InboundReturnItem = {
  id: string;
  itemId: string;
  lines: InboundReturnLineFragment[];
};

export type OutboundReturnItem = {
  id: string;
  itemId: string;
  lines: OutboundReturnLineFragment[];
};
