import {
  Invoice,
  Column,
  InvoiceLine,
  StockLine,
  OutboundShipmentStatus,
} from '@openmsupply-client/common';

export interface ItemRow extends InvoiceLine {
  batch?: string;
  costPrice?: number;
  packSize?: number;
  sellPrice?: number;
  updateQuantity: (quantity: number) => void;
}

export interface BatchRow extends StockLine {
  quantity: number;
}

export interface InvoiceStatusLog {
  draft?: string;
  allocated?: string;
  picked?: string;
  shipped?: string;
  finalised?: string;
}

export interface OutboundShipment extends Invoice {
  lines: ItemRow[];
  status: OutboundShipmentStatus;
  update?: <K extends keyof Invoice>(key: K, value: Invoice[K]) => void;
  upsertLine?: (line: InvoiceLine) => void;
}

export enum ActionType {
  UpdateQuantity = 'OutboundShipment/updateQuantity',
  UpdateInvoice = 'OutboundShipment/updateInvoice',
  SortBy = 'OutboundShipment/sortBy',
  UpsertLine = 'OutboundShipment/upsertLine',
}

type OutboundShipmentUpdateInvoice = {
  type: ActionType.UpdateInvoice;
  payload: { key: keyof Invoice; value: Invoice[keyof Invoice] };
};

export type OutboundShipmentAction =
  | {
      type: ActionType.UpdateQuantity;
      payload: { rowKey: string; quantity: number };
    }
  | {
      type: ActionType.SortBy;
      payload: { column: Column<ItemRow> };
    }
  | OutboundShipmentUpdateInvoice
  | {
      type: ActionType.UpsertLine;
      payload: { invoiceLine: InvoiceLine };
    };
