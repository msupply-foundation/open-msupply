import { Dispatch } from 'react';
import {
  Transaction,
  DraftActionSet,
  DraftActionType,
} from '@openmsupply-client/common';
import { placeholderTransaction } from './index';
import { ActionType, OutboundShipment, CustomerInvoiceAction } from './types';

export const updateQuantity = (
  rowKey: string,
  quantity: number
): CustomerInvoiceAction => ({
  type: ActionType.UpdateQuantity,
  payload: { rowKey, quantity },
});

export const OutboundAction = {
  updateQuantity,
};

export const reducer =
  (
    data: Transaction | undefined = placeholderTransaction,
    dispatch: Dispatch<DraftActionSet<CustomerInvoiceAction>> | null
  ) =>
  (
    state: OutboundShipment | undefined = placeholderTransaction,
    action: DraftActionSet<CustomerInvoiceAction>
  ): OutboundShipment => {
    switch (action.type) {
      case DraftActionType.Init: {
        return state;
      }

      case DraftActionType.Merge: {
        const newInvoice = Object.keys(state).reduce(
          (acc, key) => ({ ...acc, [key]: data[key] }),
          {} as OutboundShipment
        );

        const newItems = newInvoice.items?.map(item => ({
          ...item,
          updateQuantity: (quantity: number) =>
            dispatch?.(OutboundAction.updateQuantity(item.id, quantity)),
        }));

        newInvoice.items = newItems;

        return newInvoice;
      }

      case ActionType.UpdateQuantity: {
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
  };
