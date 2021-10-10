import { Dispatch } from 'react';
import { produce } from 'immer';
import {
  Column,
  DraftActionSet,
  DraftActionType,
  SortBy,
  Transaction,
} from '@openmsupply-client/common';
import { placeholderTransaction } from './index';
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

export const updateQuantity = (
  rowKey: string,
  quantity: number
): CustomerInvoiceAction => ({
  type: ActionType.UpdateQuantity,
  payload: { rowKey, quantity },
});

export const onSortBy = (column: Column<ItemRow>): CustomerInvoiceAction => ({
  type: ActionType.SortBy,
  payload: { column },
});

export const OutboundAction = {
  updateQuantity,
  onSortBy,
};

interface OutboundShipmentStateShape {
  draft: OutboundShipment;
  sortBy: SortBy<ItemRow>;
}

export const getInitialState = (): OutboundShipmentStateShape => ({
  draft: placeholderTransaction,
  sortBy: { key: 'quantity', isDesc: true, direction: 'asc' },
});

export const reducer = (
  data: Transaction = placeholderTransaction,
  dispatch: Dispatch<DraftActionSet<CustomerInvoiceAction>> | null
): ((
  state: OutboundShipmentStateShape | undefined,
  action: CustomerInvoiceAction
) => OutboundShipmentStateShape) =>
  produce(
    (
      state: OutboundShipmentStateShape = getInitialState(),
      action: DraftActionSet<CustomerInvoiceAction>
    ) => {
      switch (action.type) {
        case DraftActionType.Init: {
          return state;
        }

        case DraftActionType.Merge: {
          const { draft } = state;

          Object.keys(draft).forEach(key => {
            // TODO: Sometimes we want to keep the user entered values?
            draft[key] = data[key];
          });

          draft.items = draft.items.map(item => ({
            ...item,
            updateQuantity: (quantity: number) =>
              dispatch?.(OutboundAction.updateQuantity(item.id, quantity)),
          }));

          break;
        }

        case ActionType.SortBy: {
          const { payload } = action;
          const { column } = payload;

          const { key } = column;

          const { draft, sortBy } = state;
          const { items } = draft;
          const { key: currentSortKey, isDesc: currentIsDesc } = sortBy;

          const newIsDesc = currentSortKey === key ? !currentIsDesc : false;
          const newDirection: 'asc' | 'desc' = newIsDesc ? 'desc' : 'asc';
          const newSortBy = { key, isDesc: newIsDesc, direction: newDirection };

          const sorter = getDataSorter(newSortBy.key, newSortBy.isDesc);
          const newItems = items.sort(sorter);

          draft.items = newItems;
          state.sortBy = newSortBy;

          break;
        }

        case ActionType.UpdateQuantity: {
          const { payload } = action;
          const { rowKey, quantity } = payload;

          const row = state.draft.items.find(({ id }) => id === rowKey);

          if (row) {
            row.quantity = quantity;
          }

          break;
        }
      }
    }
  );
