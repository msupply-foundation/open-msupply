import {
  Invoice,
  Column,
  InvoiceLine,
  StockLine,
} from '@openmsupply-client/common';

export interface ItemRow extends InvoiceLine {
  updateQuantity: (quantity: number) => void;
}

export interface BatchRow extends StockLine {
  quantity: number;
}

export interface OutboundShipment extends Invoice {
  lines: ItemRow[];
  update?: <K extends keyof Invoice>(key: K, value: Invoice[K]) => void;
}

export enum ActionType {
  UpdateQuantity = 'OutboundShipment/updateQuantity',
  UpdateInvoice = 'OutboundShipment/updateInvoice',
  SortBy = 'OutboundShipment/sortBy',
  UpsertLine = 'OutboundShipment/upsertLine',
}

type CustomerInvoiceUpdateInvoice = {
  type: ActionType.UpdateInvoice;
  payload: { key: keyof Invoice; value: Invoice[keyof Invoice] };
};

export type CustomerInvoiceAction =
  | {
      type: ActionType.UpdateQuantity;
      payload: { rowKey: string; quantity: number };
    }
  | {
      type: ActionType.SortBy;
      payload: { column: Column<ItemRow> };
    }
  | CustomerInvoiceUpdateInvoice
  | {
      type: ActionType.UpsertLine;
      payload: { invoiceLine: InvoiceLine };
    };
