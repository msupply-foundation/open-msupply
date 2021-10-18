import { Dispatch } from 'react';
import { produce } from 'immer';
import {
  Column,
  DocumentActionSet,
  DocumentActionType,
  SortBy,
  Invoice,
} from '@openmsupply-client/common';
import { placeholderInvoice } from './index';
import {
  ActionType,
  OutboundShipment,
  CustomerInvoiceAction,
  ItemRow,
} from './types';

const parseValue = (object: any, key: string) => {
  const value = object[key];
  if (typeof value === 'string') {
    const valueAsNumber = Number.parseFloat(value);

    if (!Number.isNaN(valueAsNumber)) return valueAsNumber;
    return value.toUpperCase(); // ignore case
  }
  return value;
};

const getDataSorter = (sortKey: any, desc: boolean) => (a: any, b: any) => {
  const valueA = parseValue(a, sortKey);
  const valueB = parseValue(b, sortKey);

  if (valueA < valueB) {
    return desc ? 1 : -1;
  }
  if (valueA > valueB) {
    return desc ? -1 : 1;
  }

  return 0;
};

export const OutboundAction = {
  updateInvoice: <K extends keyof Invoice>(
    key: K,
    value: Invoice[K]
  ): CustomerInvoiceAction => ({
    type: ActionType.UpdateInvoice,
    payload: { key, value },
  }),
  updateQuantity: (
    rowKey: string,
    quantity: number
  ): CustomerInvoiceAction => ({
    type: ActionType.UpdateQuantity,
    payload: { rowKey, quantity },
  }),
  onSortBy: (column: Column<ItemRow>): CustomerInvoiceAction => ({
    type: ActionType.SortBy,
    payload: { column },
  }),
};

export interface OutboundShipmentStateShape {
  draft: OutboundShipment;
  sortBy: SortBy<ItemRow>;
}

export const getInitialState = (): OutboundShipmentStateShape => ({
  draft: placeholderInvoice,
  sortBy: { key: 'quantity', isDesc: true, direction: 'asc' },
});

export const reducer = (
  data: Invoice = placeholderInvoice,
  dispatch: Dispatch<DocumentActionSet<CustomerInvoiceAction>> | null
): ((
  state: OutboundShipmentStateShape | undefined,
  action: DocumentActionSet<CustomerInvoiceAction>
) => OutboundShipmentStateShape) =>
  produce(
    (
      state: OutboundShipmentStateShape = getInitialState(),
      action: DocumentActionSet<CustomerInvoiceAction>
    ) => {
      switch (action.type) {
        case DocumentActionType.Init: {
          return state;
        }

        case DocumentActionType.Merge: {
          const { draft } = state;

          Object.keys(draft).forEach(key => {
            // TODO: Sometimes we want to keep the user entered values?
            draft[key] = data[key];
          });

          draft.lines = draft.lines.map(item => ({
            ...item,
            updateQuantity: (quantity: number) =>
              dispatch?.(OutboundAction.updateQuantity(item.id, quantity)),
          }));

          draft.update = (key, value) => {
            dispatch?.(OutboundAction.updateInvoice(key, value));
          };

          break;
        }

        case ActionType.SortBy: {
          const { payload } = action;
          const { column } = payload;

          const { key } = column;

          const { draft, sortBy } = state;
          const { lines } = draft;
          const { key: currentSortKey, isDesc: currentIsDesc } = sortBy;

          const newIsDesc = currentSortKey === key ? !currentIsDesc : false;
          const newDirection: 'asc' | 'desc' = newIsDesc ? 'desc' : 'asc';
          const newSortBy = { key, isDesc: newIsDesc, direction: newDirection };

          const sorter = getDataSorter(newSortBy.key, newSortBy.isDesc);
          const newLines = lines.sort(sorter);

          draft.lines = newLines;
          state.sortBy = newSortBy;

          break;
        }

        case ActionType.UpdateQuantity: {
          const { payload } = action;
          const { rowKey, quantity } = payload;

          const row = state.draft.lines.find(({ id }) => id === rowKey);

          if (row) {
            row.quantity = quantity;
          }

          break;
        }

        case ActionType.UpdateInvoice: {
          const { payload } = action;
          const { key, value } = payload;

          state.draft[key] = value;

          break;
        }

        case ActionType.AddLine: {
          const { draft } = state;
          const { payload: item } = action;

          draft.lines.push({
            ...item,
            updateQuantity: (quantity: number) =>
              dispatch?.(OutboundAction.updateQuantity(item.id, quantity)),
          });

          draft.update = (key, value) => {
            dispatch?.(OutboundAction.updateInvoice(key, value));
          };

          break;
        }
      }
    }
  );
