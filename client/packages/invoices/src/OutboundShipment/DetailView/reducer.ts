import { Dispatch } from 'react';
import { produce } from 'immer';
import {
  Column,
  DocumentActionSet,
  DocumentActionType,
  SortBy,
  Invoice,
  InvoiceLine,
} from '@openmsupply-client/common';
import { placeholderInvoice } from './index';
import {
  ActionType,
  OutboundShipment,
  OutboundShipmentAction,
  OutboundShipmentRow,
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
  upsertLine: (line: OutboundShipmentRow): OutboundShipmentAction => ({
    type: ActionType.UpsertLine,
    payload: { line },
  }),
  deleteLine: (line: OutboundShipmentRow): OutboundShipmentAction => ({
    type: ActionType.DeleteLine,
    payload: { line },
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
  onSortBy: (column: Column<OutboundShipmentRow>): OutboundShipmentAction => ({
    type: ActionType.SortBy,
    payload: { column },
  }),
};

export interface OutboundShipmentStateShape {
  draft: OutboundShipment;
  sortBy: SortBy<OutboundShipmentRow>;
  deletedLines: OutboundShipmentRow[];
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
            if (key === 'lines') return;
            draft[key] = data[key];
          });

          draft.lines = data.lines?.map(serverLine => {
            const draftLine = draft.lines.find(
              line => line.id === serverLine.id
            );

            if (draftLine) {
              return mergeLines(serverLine, draftLine);
            }

            return createLine(serverLine, draft, dispatch);
          });

          draft.update = (key, value) => {
            dispatch?.(OutboundAction.updateInvoice(key, value));
          };

          draft.upsertLine = line =>
            dispatch?.(OutboundAction.upsertLine(line));

          draft.deleteLine = line =>
            dispatch?.(OutboundAction.deleteLine(line));

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

        case ActionType.UpdateInvoice: {
          const { payload } = action;
          const { key, value } = payload;

          state.draft[key] = value;

          break;
        }

        case ActionType.UpsertLine: {
          const { draft } = state;
          const { payload } = action;
          const { line } = payload;

          const { lines } = draft;

          const existingLineIdx = lines.findIndex(({ id }) => id === line.id);

          if (existingLineIdx >= 0) {
            lines[existingLineIdx] = {
              ...lines[existingLineIdx],
              ...line,
              isUpdated: true,
              isDeleted: false,
            };
          } else {
            line.isCreated = true;
            line.isUpdated = true;
            line.isDeleted = false;
            draft.lines.push(createLine(line, draft, dispatch));
          }

          draft.update = (key, value) => {
            dispatch?.(OutboundAction.updateInvoice(key, value));
          };

          break;
        }

        case ActionType.DeleteLine: {
          const { draft, deletedLines } = state;
          const { payload } = action;
          const { line } = payload;

          const idx = draft.lines.findIndex(({ id }) => id === line.id);
          draft.lines.splice(idx, 1);
          deletedLines.push(line);

          break;
        }
      }
      return state;
    }
  );

const mergeLines = (
  serverLine: InvoiceLine,
  clientLine: OutboundShipmentRow
) => {
  const newLine = {
    ...clientLine,
    ...serverLine,
    isUpdated: true,
    isCreated: false,
    isDeleted: false,
  };

  return newLine;
};

const createLine = (
  line: InvoiceLine,
  draft: OutboundShipment,
  dispatch: Dispatch<DocumentActionSet<OutboundShipmentAction>> | null
): OutboundShipmentRow => {
  return {
    ...line,
    stockLineId: '',
    invoiceId: draft.id,
    updateNumberOfPacks: (numberOfPacks: number) =>
      dispatch?.(OutboundAction.updateNumberOfPacks(line.id, numberOfPacks)),
  };
};
