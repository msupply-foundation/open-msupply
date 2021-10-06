import {
  Item,
  Transaction,
  DefaultDraftAction,
} from '@openmsupply-client/common';

export interface ItemRow extends Item {
  updateQuantity: (quantity: number) => void;
}

export interface OutboundShipment extends Transaction {
  items: ItemRow[];
}

export enum ActionType {
  UpdateQuantity = 'OutboundShipment/updateQuantity',
}

export type CustomerInvoiceAction =
  | DefaultDraftAction
  | {
      type: ActionType.UpdateQuantity;
      payload: { rowKey: string; quantity: number };
    };
