import { Invoice, Column, InvoiceLine } from '@openmsupply-client/common';

export interface ItemRow extends InvoiceLine {
  updateQuantity: (quantity: number) => void;
}

export interface OutboundShipment extends Invoice {
  lines: ItemRow[];
}

export enum ActionType {
  UpdateQuantity = 'OutboundShipment/updateQuantity',
  SortBy = 'OutboundShipment/sortBy',
}

export type CustomerInvoiceAction =
  | {
      type: ActionType.UpdateQuantity;
      payload: { rowKey: string; quantity: number };
    }
  | {
      type: ActionType.SortBy;
      payload: { column: Column<ItemRow> };
    };
