import { Dispatch } from 'react';
import {
  Column,
  produce,
  DocumentActionSet,
  DocumentActionType,
  SortBy,
  StocktakeNodeStatus,
  ifTheSameElseDefault,
  getDataSorter,
} from '@openmsupply-client/common';
import {
  StocktakeLine,
  StocktakeItem,
  StocktakeActionType,
  StocktakeAction,
  Stocktake,
  StocktakeController,
} from '../../types';

import { placeholderStocktake } from '../../utils';

export interface StocktakeStateShape {
  draft: StocktakeController;
  sortBy: SortBy<StocktakeItem>;
}

export const StocktakeActionCreator = {
  update: (key: string, value: string): StocktakeAction => {
    return {
      type: StocktakeActionType.Update,
      payload: { key, value },
    };
  },
  updateStocktakeDatetime: (newDate: Date | null): StocktakeAction => {
    return {
      type: StocktakeActionType.UpdateStocktakeDatetime,
      payload: { newDate },
    };
  },
  updateOnHold: (): StocktakeAction => {
    return {
      type: StocktakeActionType.UpdateOnHold,
    };
  },
  updateStatus: (newStatus: StocktakeNodeStatus): StocktakeAction => {
    return {
      type: StocktakeActionType.UpdateStatus,
      payload: { newStatus },
    };
  },
  sortBy: (column: Column<StocktakeItem>): StocktakeAction => ({
    type: StocktakeActionType.SortBy,
    payload: { column },
  }),
  upsertItem: (item: StocktakeItem): StocktakeAction => ({
    type: StocktakeActionType.Upsert,
    payload: { item },
  }),
};

export const getInitialState = (): StocktakeStateShape => ({
  draft: placeholderStocktake,
  sortBy: { key: 'itemName', isDesc: false, direction: 'asc' },
});

const toLookup = <T, K extends keyof T & string>(
  things: T[],
  key: K
): Record<string, T[]> => {
  const lookup: Record<string, T[]> = {} as Record<string, T[]>;
  things.forEach(thing => {
    const value = String(thing[key]);
    if (!lookup[value]) {
      lookup[value] = [];
    }
    (lookup[value] ?? []).push(thing);
  });
  return lookup;
};

export const createStocktakeItem = (
  id: string,
  lines: StocktakeLine[]
): StocktakeItem => {
  return {
    id,
    lines,
    itemName: () => ifTheSameElseDefault(lines, 'itemName', ''),
    itemCode: () => ifTheSameElseDefault(lines, 'itemCode', ''),
    batch: () => ifTheSameElseDefault(lines, 'batch', '[multiple]') ?? '',
    expiryDate: () =>
      ifTheSameElseDefault(lines, 'expiryDate', '[multiple]') ?? '',
    countedNumPacks: () =>
      String(ifTheSameElseDefault(lines, 'countedNumPacks', '[multiple]')),
    snapshotNumPacks: () =>
      String(ifTheSameElseDefault(lines, 'snapshotNumPacks', '[multiple]')),
    upsertLine: () => {},
  };
};

const createStocktakeItems = (lines: StocktakeLine[]) => {
  const lookup = toLookup(lines, 'itemId');
  const ids = Object.keys(lookup);
  return ids.map(id => createStocktakeItem(id, lookup[id] ?? []));
};

export const reducer = (
  data: Stocktake | undefined,
  dispatch: Dispatch<DocumentActionSet<StocktakeAction>> | null
): ((
  state: StocktakeStateShape | undefined,
  action: DocumentActionSet<StocktakeAction>
) => StocktakeStateShape) =>
  produce(
    (
      state: StocktakeStateShape = getInitialState(),
      action: DocumentActionSet<StocktakeAction>
    ) => {
      switch (action.type) {
        case DocumentActionType.Init: {
          return state;
        }

        case DocumentActionType.Merge: {
          state.draft = {
            ...state.draft,
            ...data,
            lines: createStocktakeItems(data?.lines ?? []),
            update: (key: string, value: string) => {
              dispatch?.(StocktakeActionCreator.update(key, value));
            },
            updateStocktakeDatetime: (newDate: Date | null) => {
              dispatch?.(
                StocktakeActionCreator.updateStocktakeDatetime(newDate)
              );
            },
            updateOnHold: () => {
              dispatch?.(StocktakeActionCreator.updateOnHold());
            },
            updateStatus: (newStatus: StocktakeNodeStatus) =>
              dispatch?.(StocktakeActionCreator.updateStatus(newStatus)),
            sortBy: (column: Column<StocktakeItem>) =>
              dispatch?.(StocktakeActionCreator.sortBy(column)),
            upsertItem: (item: StocktakeItem) =>
              dispatch?.(StocktakeActionCreator.upsertItem(item)),
          };

          break;
        }

        case StocktakeActionType.Update: {
          const { payload } = action;
          const { value, key } = payload;

          if (key === 'comment') {
            state.draft.comment = value as string;
          }
          if (key === 'description') {
            state.draft.description = value as string;
          }

          break;
        }

        case StocktakeActionType.UpdateStocktakeDatetime: {
          const { payload } = action;
          const { newDate } = payload;
          state.draft.stocktakeDatetime = newDate;
          break;
        }

        case StocktakeActionType.UpdateOnHold: {
          state.draft.onHold = !state.draft.onHold;
          break;
        }

        case StocktakeActionType.UpdateStatus: {
          // TODO: Probably there should be some more checks here for
          // finalising
          state.draft.status = action.payload.newStatus;
          break;
        }

        case StocktakeActionType.SortBy: {
          const { payload } = action;
          const { column } = payload;

          const { key } = column;

          const { draft, sortBy } = state;
          const { lines } = draft;
          const { key: currentSortKey, isDesc: currentIsDesc } = sortBy;

          const newIsDesc = currentSortKey === key ? !currentIsDesc : false;
          const newDirection: 'asc' | 'desc' = newIsDesc ? 'desc' : 'asc';
          const newSortBy: SortBy<StocktakeItem> = {
            key,
            isDesc: newIsDesc,
            direction: newDirection,
          };

          const sortedLines = lines.sort(
            getDataSorter(
              newSortBy.key as keyof StocktakeItem,
              !!newSortBy.isDesc
            )
          );

          draft.lines = sortedLines;
          state.sortBy = newSortBy;

          break;
        }

        case StocktakeActionType.Upsert: {
          const { payload } = action;
          const { item } = payload;

          const itemIdx = state.draft.lines.findIndex(i => i.id === item.id);
          if (itemIdx >= 0) state.draft.lines[itemIdx] = item;
          else state.draft.lines.push(item);

          break;
        }
      }

      return state;
    }
  );
