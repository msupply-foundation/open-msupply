import {
  getUnitQuantity,
  getSumOfKeyReducer,
} from '@openmsupply-client/common/src/utils/arrays/reducers';
import { Dispatch } from 'react';
import { produce } from 'immer';
import {
  Column,
  DocumentActionSet,
  DocumentActionType,
  SortBy,
  ifTheSameElseDefault,
  Item,
  arrayToRecord,
  getDataSorter,
  getColumnSorter,
} from '@openmsupply-client/common';
import { placeholderInvoice, placeholderOutboundShipment } from '../../utils';
import {
  Invoice,
  InvoiceLine,
  ActionType,
  OutboundShipment,
  OutboundShipmentAction,
  OutboundShipmentSummaryItem,
  OutboundShipmentRow,
} from '../../types';

const getExistingLine = (
  items: OutboundShipmentSummaryItem[],
  line: OutboundShipmentRow
): {
  existingSummaryItem?: OutboundShipmentSummaryItem;
  existingRow?: OutboundShipmentRow;
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
  summaryItem: OutboundShipmentSummaryItem
): {
  unitQuantity: number;
  numberOfPacks: number;
  locationName?: string | null;
  batch?: string | null;
  expiryDate?: string | null;
  sellPricePerPack?: number;
  packSize?: number;
} => {
  const batches = Object.values<OutboundShipmentRow>(summaryItem.batches);
  const unitQuantity = batches.reduce(getUnitQuantity, 0);
  const numberOfPacks = batches.reduce(getSumOfKeyReducer('numberOfPacks'), 0);
  const locationName = ifTheSameElseDefault(batches, 'locationName', undefined);
  const batch = ifTheSameElseDefault(batches, 'batch', '[multiple]');
  const expiryDate = ifTheSameElseDefault(batches, 'expiryDate', '[multiple]');
  const sellPricePerPack = ifTheSameElseDefault(
    batches,
    'sellPricePerPack',
    undefined
  );
  const packSize = ifTheSameElseDefault(batches, 'packSize', undefined);

  return {
    unitQuantity,
    numberOfPacks,
    locationName,
    batch,
    expiryDate,
    sellPricePerPack,
    packSize,
  };
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

  // TODO: This type is not correct and should be the keyof OutboundShipment
  // or possibly a smaller sub set of 'allowable' updatable keys. For example
  // the date of a status change should not be editable.
  updateInvoice: <K extends keyof Invoice>(
    key: K,
    value: Invoice[K]
  ): OutboundShipmentAction => ({
    type: ActionType.UpdateInvoice,
    payload: { key, value },
  }),

  onSortBy: (
    column: Column<OutboundShipmentSummaryItem>
  ): OutboundShipmentAction => ({
    type: ActionType.SortBy,
    payload: { column },
  }),
};

export interface OutboundShipmentStateShape {
  draft: OutboundShipment;
  sortBy: SortBy<OutboundShipmentSummaryItem>;
}

export const itemToSummaryItem = (item: Item): OutboundShipmentSummaryItem => {
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
  batches: OutboundShipmentRow[] = []
): OutboundShipmentSummaryItem => {
  const item: OutboundShipmentSummaryItem = {
    id: itemId,
    itemId: itemId,
    itemName: ifTheSameElseDefault(batches, 'itemName', ''),
    itemCode: ifTheSameElseDefault(batches, 'itemCode', ''),
    // itemUnit: ifTheSameElseDefault(batches, 'itemUnit', ''),
    batches: arrayToRecord(batches),
    unitQuantity: batches.reduce(getUnitQuantity, 0),
    numberOfPacks: batches.reduce(getSumOfKeyReducer('numberOfPacks'), 0),
    locationName: ifTheSameElseDefault(batches, 'locationName', undefined),

    batch: ifTheSameElseDefault(batches, 'batch', '[multiple]'),
    expiryDate: ifTheSameElseDefault(batches, 'expiryDate', '[multiple]'),
    // TODO: Likely should just be a string.
    sellPricePerPack: ifTheSameElseDefault(
      batches,
      'sellPricePerPack',
      undefined
    ),
    // TODO: Likely should just be a string.
    packSize: ifTheSameElseDefault(batches, 'packSize', undefined),
    canExpand: batches.length > 1,
  };

  return item;
};

export const getInitialState = (): OutboundShipmentStateShape => ({
  draft: placeholderOutboundShipment,
  sortBy: { key: 'numberOfPacks', isDesc: true, direction: 'asc' },
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
          state.draft.update = (key, value) => {
            dispatch?.(OutboundAction.updateInvoice(key, value));
          };

          state.draft.upsertLine = line =>
            dispatch?.(OutboundAction.upsertLine(line));

          state.draft.deleteLine = line =>
            dispatch?.(OutboundAction.deleteLine(line));

          state.draft.items = data.lines?.reduce((itemsArray, serverLine) => {
            const outboundShipmentRow = createLine(serverLine, state.draft);

            const { existingRow, existingSummaryItem } = getExistingLine(
              itemsArray,
              outboundShipmentRow
            );

            const summaryItem =
              existingSummaryItem ??
              createSummaryItem(serverLine.itemId, [outboundShipmentRow]);

            if (existingRow) {
              delete summaryItem.batches[existingRow.id];
              const newLine = mergeLines(serverLine, existingRow);

              summaryItem.batches[newLine.id] = newLine;
            } else {
              summaryItem.batches[outboundShipmentRow.id] = outboundShipmentRow;
            }

            const {
              unitQuantity,
              numberOfPacks,
              locationName,
              batch,
              expiryDate,
              sellPricePerPack,
              packSize,
            } = recalculateSummary(summaryItem);

            if (!existingSummaryItem) {
              itemsArray.push({
                ...summaryItem,
                unitQuantity,
                numberOfPacks,
                locationName,
                batch,
                expiryDate,
                sellPricePerPack,
                packSize,
              });
            } else {
              existingSummaryItem.unitQuantity = unitQuantity;
              existingSummaryItem.numberOfPacks = numberOfPacks;
              existingSummaryItem.locationName = locationName;
              existingSummaryItem.batch = batch;
              existingSummaryItem.expiryDate = expiryDate;
              existingSummaryItem.sellPricePerPack = sellPricePerPack;
              existingSummaryItem.packSize = packSize;
              existingSummaryItem.canExpand =
                Object.keys(existingSummaryItem.batches).length > 1;
            }

            return itemsArray;
          }, state.draft.items);

          state.draft = {
            ...state.draft,
            ...data,
            items: state.draft.items,
          };

          break;
        }

        case ActionType.SortBy: {
          const { payload } = action;
          const { column } = payload;

          const { key, getSortValue } = column;

          const { draft, sortBy } = state;
          const { items } = draft;
          const { key: currentSortKey, isDesc: currentIsDesc } = sortBy;

          const newIsDesc = currentSortKey === key ? !currentIsDesc : false;
          const newDirection: 'asc' | 'desc' = newIsDesc ? 'desc' : 'asc';
          const newSortBy: SortBy<OutboundShipmentSummaryItem> = {
            key,
            isDesc: newIsDesc,
            direction: newDirection,
          };

          const sorter = getSortValue
            ? getColumnSorter(getSortValue, !!newSortBy.isDesc)
            : getDataSorter<
                OutboundShipmentSummaryItem,
                keyof OutboundShipmentSummaryItem
              >(
                newSortBy.key as keyof OutboundShipmentSummaryItem,
                !!newSortBy.isDesc
              );
          const newItems = items.sort(sorter);

          draft.items = newItems;
          state.sortBy = newSortBy;

          break;
        }

        case ActionType.UpdateInvoice: {
          const { payload } = action;
          const { key, value } = payload;

          // TODO: The type of value is typed in the action creator,
          // but not in the action. Should be safe for now but should
          // be fixed
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          state.draft[key] = value;

          break;
        }

        case ActionType.UpsertLine: {
          const { draft } = state;
          const { payload } = action;
          const { items } = draft;

          const { line } = payload;

          const { existingSummaryItem, existingRow } = getExistingLine(
            items,
            line
          );

          // If the row is being updated
          if (existingSummaryItem) {
            if (existingRow) {
              if (line.numberOfPacks === 0) {
                // Then, if the new number of packs is zero, delete the row
                // Deleting: If the line is created, remove it from state completely.
                if (line.isCreated) {
                  delete existingSummaryItem.batches[line.id];

                  // If this was the last line being removed, also remove the summary item.
                  if (!Object.values(existingSummaryItem.batches).length) {
                    draft.items = draft.items.filter(
                      ({ id }) => existingSummaryItem.id !== id
                    );
                  }
                  break;
                  // Otherwise, mark for deletion,
                } else {
                  existingRow.isUpdated = false;
                  existingRow.isDeleted = true;
                  existingRow.isCreated = false;
                  existingRow.numberOfPacks = line.numberOfPacks;
                }

                // Otherwise, update as per normal.
              } else {
                existingRow.isUpdated = existingRow.isCreated ? false : true;
                existingRow.isDeleted = false;
                existingRow.numberOfPacks = line.numberOfPacks;
              }

              const {
                unitQuantity,
                numberOfPacks,
                locationName,
                batch,
                expiryDate,
                sellPricePerPack,
                packSize,
              } = recalculateSummary(existingSummaryItem);
              existingSummaryItem.unitQuantity = unitQuantity;
              existingSummaryItem.numberOfPacks = numberOfPacks;
              existingSummaryItem.batches[existingRow.id] = existingRow;
              existingSummaryItem.locationName = locationName;
              existingSummaryItem.batch = batch;
              existingSummaryItem.expiryDate = expiryDate;
              existingSummaryItem.sellPricePerPack = sellPricePerPack;
              existingSummaryItem.packSize = packSize;
              existingSummaryItem.canExpand =
                Object.keys(existingSummaryItem.batches).length > 1;
            } else {
              if (line.numberOfPacks === 0) break;
              const newLine = {
                ...line,
                invoiceId: draft.id,
                isCreated: true,
                isUpdated: false,
                isDeleted: false,
              };
              existingSummaryItem.batches[newLine.id] = newLine;
            }
          } else {
            // Ignore lines which have a number of packs of zero.
            if (line.numberOfPacks === 0) {
              break;
            }

            const newLine = {
              ...line,
              invoiceId: draft.id,
              isCreated: true,
              isUpdated: false,
              isDeleted: false,
            };
            const summaryItem = createSummaryItem(line.itemId, [newLine]);
            items.push(summaryItem);
          }

          break;
        }

        case ActionType.DeleteLine: {
          const { draft } = state;
          const { items } = draft;
          const { payload } = action;

          const { line } = payload;

          const { existingRow, existingSummaryItem } = getExistingLine(
            items,
            line
          );

          if (existingRow && existingSummaryItem) {
            if (existingRow.isCreated) {
              delete existingSummaryItem.batches[line.id];
              if (Object.keys(existingSummaryItem.batches).length === 0) {
                const idx = items.findIndex(
                  ({ id }) => id === existingSummaryItem.id
                );
                items.splice(idx, 1);
              }
            } else {
              if (existingSummaryItem.batches[line.id]) {
                // The if condition above doesn't help TS know that this is guaranteed
                // to be defined.
                (
                  existingSummaryItem.batches[
                    existingRow.id
                  ] as OutboundShipmentRow
                ).isDeleted = true;

                const allDeleted = Object.values(
                  existingSummaryItem.batches
                ).every(({ isDeleted }) => isDeleted);
                if (allDeleted) existingSummaryItem.isDeleted = true;
              }
            }
          }

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
  draft: OutboundShipment
): OutboundShipmentRow => {
  return {
    ...line,
    stockLineId: line.stockLine?.id ?? '',
    invoiceId: draft.id,
  };
};
