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
  InvoiceLineRow,
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
  upsertLine: (invoiceLine: InvoiceLine): OutboundShipmentAction => ({
    type: ActionType.UpsertLine,
    payload: { invoiceLine },
  }),
  deleteLine: (invoiceLine: InvoiceLine): OutboundShipmentAction => ({
    type: ActionType.DeleteLine,
    payload: { invoiceLine },
  }),
  updateInvoice: <K extends keyof Invoice>(
    key: K,
    value: Invoice[K]
  ): OutboundShipmentAction => ({
    type: ActionType.UpdateInvoice,
    payload: { key, value },
  }),
  updateNumberOfPacks: (
    rowKey: string,
    numberOfPacks: number
  ): OutboundShipmentAction => ({
    type: ActionType.UpdateNumberOfPacks,
    payload: { rowKey, numberOfPacks },
  }),
  updateComment: (rowKey: string, comment: string): OutboundShipmentAction => ({
    type: ActionType.UpdateComment,
    payload: { rowKey, comment },
  }),
  onSortBy: (column: Column<InvoiceLineRow>): OutboundShipmentAction => ({
    type: ActionType.SortBy,
    payload: { column },
  }),
};

export interface OutboundShipmentStateShape {
  draft: OutboundShipment;
  sortBy: SortBy<InvoiceLineRow>;
  deletedLines: InvoiceLine[];
}

export const getInitialState = (): OutboundShipmentStateShape => ({
  draft: placeholderInvoice,
  sortBy: { key: 'numberOfPacks', isDesc: true, direction: 'asc' },
  deletedLines: [],
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

          draft.upsertLine = invoiceLine =>
            dispatch?.(OutboundAction.upsertLine(invoiceLine));

          draft.deleteLine = invoiceLine =>
            dispatch?.(OutboundAction.deleteLine(invoiceLine));

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

        case ActionType.UpdateNumberOfPacks: {
          const { payload } = action;
          const { rowKey, numberOfPacks } = payload;

          const row = state.draft.lines?.find(({ id }) => id === rowKey);

          if (row) {
            row.numberOfPacks = numberOfPacks;
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

        case ActionType.DeleteLine: {
          const { draft, deletedLines } = state;
          const { payload } = action;
          const { invoiceLine } = payload;

          const idx = draft.lines.findIndex(({ id }) => id === invoiceLine.id);
          draft.lines.splice(idx, 1);
          deletedLines.push(invoiceLine);

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
    updateNumberOfPacks: (numberOfPacks: number) =>
      dispatch?.(OutboundAction.updateNumberOfPacks(line.id, numberOfPacks)),
    updateComment: (comment: string) =>
      dispatch?.(OutboundAction.updateComment(line.id, comment)),
  };
};
