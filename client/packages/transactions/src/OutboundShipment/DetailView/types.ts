import { Dispatch } from 'react';
import { Item, Transaction } from '@openmsupply-client/common';

export interface ItemRow extends Item {
  dispatch: Dispatch<CustomerInvoiceAction> | null;
}

export interface OutboundShipment extends Transaction {
  dispatch: Dispatch<CustomerInvoiceAction> | null;
  items: ItemRow[];
}

export type CustomerInvoiceAction =
  | DraftReducerActionCreators
  | {
      type: 'CustomerInvoice/updateQuantity';
      payload: { rowKey: string; quantity: number };
    };

export type DraftReducerActionCreators =
  | { type: 'draft/init' }
  | { type: 'draft/merge' };
