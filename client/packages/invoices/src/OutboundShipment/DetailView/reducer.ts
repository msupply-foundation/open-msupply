import { InvoiceLine } from './../../../../common/src/types';
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
  OutboundShipmentAction,
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
  ): OutboundShipmentAction => ({
    type: ActionType.UpdateInvoice,
    payload: { key, value },
  }),
  updateQuantity: (
    rowKey: string,
    quantity: number
  ): OutboundShipmentAction => ({
    type: ActionType.UpdateQuantity,
    payload: { rowKey, quantity },
  }),
  updateComment: (rowKey: string, comment: string): OutboundShipmentAction => ({
    type: ActionType.UpdateComment,
    payload: { rowKey, comment },
  }),
  onSortBy: (column: Column<ItemRow>): OutboundShipmentAction => ({
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
  dispatch: Dispatch<DocumentActionSet<OutboundShipmentAction>> | null
): ((
  state: OutboundShipmentStateShape | undefined,
  action: DocumentActionSet<OutboundShipmentAction>
) => OutboundShipmentStateShape) =>
  produce(
    (
      state: OutboundShipmentStateShape = getInitialState(),
      action: DocumentActionSet<OutboundShipmentAction>
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

          draft.lines = draft.lines?.map(item => createLine(item, dispatch));

          draft.update = (key, value) => {
            dispatch?.(OutboundAction.updateInvoice(key, value));
          };

          draft.upsertLine = invoiceLine => {
            dispatch?.({
              type: ActionType.UpsertLine,
              payload: { invoiceLine },
            });
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

          const row = state.draft.lines?.find(({ id }) => id === rowKey);

          if (row) {
            row.quantity = quantity;
          }

          break;
        }

        case ActionType.UpdateComment: {
          const { payload } = action;
          const { rowKey, comment } = payload;

          const row = state.draft.lines?.find(({ id }) => id === rowKey);

          if (row) {
            row.comment = comment;
          }

          break;
        }

        case ActionType.UpdateInvoice: {
          const { payload } = action;
          const { key, value } = payload;

          state.draft[key] = value;

          break;
        }

        case ActionType.UpsertLine: {
          const { draft } = state;
          const { payload } = action;
          const { invoiceLine } = payload;

          draft.lines.push(createLine(invoiceLine, dispatch));

          draft.update = (key, value) => {
            dispatch?.(OutboundAction.updateInvoice(key, value));
          };

          break;
        }
      }
      return state;
    }
  );

const createLine = (
  line: InvoiceLine,
  dispatch: Dispatch<DocumentActionSet<OutboundShipmentAction>> | null
) => {
  return {
    ...line,
    updateQuantity: (quantity: number) =>
      dispatch?.(OutboundAction.updateQuantity(line.id, quantity)),
    updateComment: (comment: string) =>
      dispatch?.(OutboundAction.updateComment(line.id, comment)),
  };
};
