import { Dispatch } from 'react';
import { placeholderTransaction } from './index';
import { Transaction } from '@openmsupply-client/common';
import { OutboundShipment, CustomerInvoiceAction } from './types';

export const reducer =
  (
    data: Transaction | undefined = placeholderTransaction,
    dispatch: Dispatch<CustomerInvoiceAction> | null
  ) =>
  (
    state: OutboundShipment | undefined = placeholderTransaction,
    action: CustomerInvoiceAction
  ): OutboundShipment => {
    switch (action.type) {
      case 'draft/merge': {
        const newInvoice = Object.keys(state).reduce(
          (acc, key) => ({ ...acc, [key]: data[key] }),
          {} as OutboundShipment
        );
        newInvoice.dispatch = dispatch;

        const newItems = newInvoice.items?.map(item => ({
          ...item,
          dispatch,
        }));

        newInvoice.items = newItems;

        return newInvoice;
      }

      case 'CustomerInvoice/updateQuantity': {
        const { payload } = action;
        const { rowKey, quantity } = payload;

        const rowIdx = state.items.findIndex(({ id }) => id === rowKey);
        const row = state.items[rowIdx];

        if (row) {
          const newRow = { ...row, quantity };
          const newItems = [...state.items];
          newItems[rowIdx] = newRow;
          const newState = { ...state, items: newItems };

          return newState;
        }

        return state;
      }
    }

    return placeholderTransaction;
  };
