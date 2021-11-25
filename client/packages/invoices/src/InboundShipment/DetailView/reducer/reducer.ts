import {
  getUnitQuantity,
  getSumOfKeyReducer,
  produce,
  Column,
  DocumentActionSet,
  DocumentActionType,
  SortBy,
  ifTheSameElseDefault,
  Item,
  arrayToRecord,
  getDataSorter,
} from '@openmsupply-client/common';
import { placeholderInbound } from '../../../utils';
import {
  ActionType,
  OutboundShipmentAction,
  Invoice,
  InvoiceLine,
  InboundShipment,
  InboundShipmentItem,
  InboundShipmentRow,
} from '../../../types';
import { Dispatch } from 'react';

const getExistingLine = (
  items: InboundShipmentItem[],
  line: InboundShipmentRow
): {
  existingSummaryItem?: InboundShipmentItem;
  existingRow?: InboundShipmentRow;
} => {
  const existingSummaryItem = items.find(
    item => !!item.batches[line.id] || item.itemId === line.itemId
  );

  if (!existingSummaryItem) return {};

  let existingRow = existingSummaryItem.batches[line.id];

  if (existingRow) return { existingRow, existingSummaryItem };

  existingRow = Object.values(existingSummaryItem.batches).find(
    ({ stockLineId }) => stockLineId === line.stockLineId
  );

  return { existingRow, existingSummaryItem };
};

export const recalculateSummary = (
  summaryItem: InboundShipmentItem
): { unitQuantity: number; numberOfPacks: number } => {
  const unitQuantity = Object.values<InboundShipmentRow>(
    summaryItem.batches
  ).reduce(getUnitQuantity, 0);

  const numberOfPacks = Object.values<InboundShipmentRow>(
    summaryItem.batches
  ).reduce(getSumOfKeyReducer('numberOfPacks'), 0);

  return { unitQuantity, numberOfPacks };
};

export const InboundAction = {
  upsertLine: (line: InboundShipmentRow): OutboundShipmentAction => ({
    type: ActionType.UpsertLine,
    payload: { line },
  }),

  upsertItem: (item: InboundShipmentItem): OutboundShipmentAction => ({
    type: ActionType.UpsertItem,
    payload: { item },
  }),

  deleteLine: (line: InboundShipmentRow): OutboundShipmentAction => ({
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

  onSortBy: (column: Column<InboundShipmentItem>): OutboundShipmentAction => ({
    type: ActionType.SortBy,
    payload: { column },
  }),
};

export interface InboundShipmentStateShape {
  draft: InboundShipment;
  sortBy: SortBy<InboundShipmentItem>;
}

export const itemToSummaryItem = (item: Item): InboundShipmentItem => {
  return {
    id: item.id,
    itemId: item.id,
    itemName: item.name,
    itemCode: item.code,
    itemUnit: item.unitName,
    batches: {},
    unitQuantity: 0,
    numberOfPacks: 0,
  };
};

export const createSummaryItem = (
  itemId: string,
  batches: InboundShipmentRow[] = []
): InboundShipmentItem => {
  const item: InboundShipmentItem = {
    id: itemId,
    itemId: itemId,
    itemName: ifTheSameElseDefault(batches, 'itemName', ''),
    itemCode: ifTheSameElseDefault(batches, 'itemCode', ''),
    // itemUnit: ifTheSameElseDefault(batches, 'itemUnit', ''),
    batches: arrayToRecord(batches),
    unitQuantity: batches.reduce(getUnitQuantity, 0),
    numberOfPacks: batches.reduce(getSumOfKeyReducer('numberOfPacks'), 0),
    // locationDescription: ifTheSameElseDefault(
    //   batches,
    //   'locationDescription',
    //   undefined
    // ),

    batch: ifTheSameElseDefault(batches, 'batch', '[multiple]'),
    // TODO: Likely should just be a string.
    sellPrice: ifTheSameElseDefault(batches, 'sellPricePerPack', undefined),
    // TODO: Likely should just be a string.
    packSize: ifTheSameElseDefault(batches, 'packSize', undefined),
  };

  return item;
};

export const getInitialState = (): InboundShipmentStateShape => ({
  draft: placeholderInbound,
  sortBy: { key: 'numberOfPacks', isDesc: true, direction: 'asc' },
});

export const reducer = (
  data: Invoice = placeholderInbound,
  dispatch: Dispatch<DocumentActionSet<OutboundShipmentAction>> | null
): ((
  state: InboundShipmentStateShape | undefined,
  action: DocumentActionSet<OutboundShipmentAction>
) => InboundShipmentStateShape) =>
  produce(
    (
      state: InboundShipmentStateShape = getInitialState(),
      action: DocumentActionSet<OutboundShipmentAction>
    ) => {
      switch (action.type) {
        case DocumentActionType.Init: {
          return state;
        }

        case DocumentActionType.Merge: {
          state.draft = {
            ...state.draft,
            ...data,
            status: state.draft.status,
          };

          state.draft.update = (key, value) => {
            dispatch?.(InboundAction.updateInvoice(key, value));
          };

          state.draft.upsertItem = (item: InboundShipmentItem) => {
            dispatch?.(InboundAction.upsertItem(item));
          };

          state.draft.items = data.lines?.reduce((itemsArray, serverLine) => {
            const InboundShipmentRow = createLine(serverLine, state.draft);

            const { existingRow, existingSummaryItem } = getExistingLine(
              itemsArray,
              InboundShipmentRow
            );

            const summaryItem =
              existingSummaryItem ??
              createSummaryItem(serverLine.itemId, [InboundShipmentRow]);

            if (existingRow) {
              delete summaryItem.batches[existingRow.id];
              const newLine = mergeLines(serverLine, existingRow);
              summaryItem.batches[newLine.id] = newLine;
            } else {
              summaryItem.batches[InboundShipmentRow.id] = InboundShipmentRow;
            }

            const { unitQuantity, numberOfPacks } =
              recalculateSummary(summaryItem);

            if (!existingSummaryItem) {
              itemsArray.push({
                ...summaryItem,
                unitQuantity,
                numberOfPacks,
              });
            } else {
              existingSummaryItem.unitQuantity = unitQuantity;
              existingSummaryItem.numberOfPacks = numberOfPacks;
            }

            return itemsArray;
          }, state.draft.items);

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
          const newSortBy: SortBy<InboundShipmentItem> = {
            key,
            isDesc: newIsDesc,
            direction: newDirection,
          };

          const newItems = items.sort(
            getDataSorter(
              newSortBy.key as keyof InboundShipmentItem,
              !!newSortBy.isDesc
            )
          );

          draft.items = newItems;
          state.sortBy = newSortBy;

          break;
        }

        case ActionType.UpdateInvoice: {
          const { payload } = action;
          const { key, value } = payload;

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          state.draft[key] = value;

          break;
        }

        case ActionType.UpsertItem: {
          const { payload } = action;
          const { item } = payload;

          const itemIdx = state.draft.items.findIndex(i => i.id === item.id);
          if (itemIdx > 0) state.draft.items[itemIdx] = item;
          else state.draft.items.push(item);

          break;
        }
      }

      return state;
    }
  );

const mergeLines = (
  serverLine: InvoiceLine,
  clientLine: InboundShipmentRow
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
  draft: InboundShipment
): InboundShipmentRow => {
  return {
    ...line,
    stockLineId: line.stockLine?.id ?? '',
    invoiceId: draft.id,
  };
};
