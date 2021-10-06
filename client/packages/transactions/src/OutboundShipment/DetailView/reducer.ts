import { Dispatch } from 'react';
import {
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

export const onSortBy = (key: keyof ItemRow): CustomerInvoiceAction => ({
  type: ActionType.SortBy,
  payload: { key },
});

export const OutboundAction = {
  updateQuantity,
  onSortBy,
};

interface InitialState {
  draft: OutboundShipment;
  sortBy: SortBy<ItemRow>;
}

export const getInitialState = (): InitialState => ({
  draft: placeholderTransaction,
  sortBy: { key: 'quantity', isDesc: true, direction: 'asc' },
});

export const reducer =
  (
    data: Transaction = placeholderTransaction,
    dispatch: Dispatch<DraftActionSet<CustomerInvoiceAction>> | null
  ) =>
  (
    state = getInitialState(),
    action: DraftActionSet<CustomerInvoiceAction>
  ): ReturnType<typeof getInitialState> => {
    switch (action.type) {
      case DraftActionType.Init: {
        return state;
      }

      case DraftActionType.Merge: {
        const newInvoice = Object.keys(state.draft).reduce(
          (acc, key) => ({ ...acc, [key]: data[key] }),
          {} as OutboundShipment
        );

        const newItems = newInvoice.items?.map(item => ({
          ...item,
          updateQuantity: (quantity: number) =>
            dispatch?.(OutboundAction.updateQuantity(item.id, quantity)),
        }));

        newInvoice.items = newItems;

        return { ...state, draft: newInvoice };
      }

      case ActionType.SortBy: {
        const { payload } = action;
        const { key } = payload;

        const { draft, sortBy } = state;
        const { items } = draft;
        const { key: currentSortKey, isDesc: currentIsDesc } = sortBy;

        const newIsDesc = currentSortKey === key ? !currentIsDesc : false;
        const newDirection: 'asc' | 'desc' = newIsDesc ? 'desc' : 'asc';
        const newSortBy = { key, isDesc: newIsDesc, direction: newDirection };

        const sorter = getDataSorter(newSortBy.key, newSortBy.isDesc);
        const newItems = items.sort(sorter);
        draft.items = newItems;

        return { ...state, sortBy: newSortBy };
      }

      case ActionType.UpdateQuantity: {
        const { payload } = action;
        const { rowKey, quantity } = payload;

        const rowIdx = state.draft.items.findIndex(({ id }) => id === rowKey);
        const row = state.draft.items[rowIdx];

        if (row) {
          const newRow = { ...row, quantity };
          const newItems = [...state.draft.items];
          newItems[rowIdx] = newRow;
          const newState = { ...state, items: newItems };

          return newState;
        }

        return state;
      }
    }
  };
