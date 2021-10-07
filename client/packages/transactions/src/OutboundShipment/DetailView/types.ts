import {
  Item,
  Transaction,
  DefaultDraftAction,
  Column,
} from '@openmsupply-client/common';

export interface ItemRow extends Item {
  updateQuantity: (quantity: number) => void;
}

export interface OutboundShipment extends Transaction {
  items: ItemRow[];
}

export enum ActionType {
  UpdateQuantity = 'OutboundShipment/updateQuantity',
  SortBy = 'OutboundShipment/sortBy',
}

export type CustomerInvoiceAction =
  | DefaultDraftAction
  | {
      type: ActionType.UpdateQuantity;
      payload: { rowKey: string; quantity: number };
    }
  | {
      type: ActionType.SortBy;
      payload: { column: Column<ItemRow> };
    };
