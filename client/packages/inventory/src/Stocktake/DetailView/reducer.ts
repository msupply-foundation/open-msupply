import {
  StocktakeItem,
  StocktakeActionType,
  StocktakeController,
} from '../../types';
import { Dispatch } from 'react';
import {
  produce,
  DocumentActionSet,
  DocumentActionType,
  SortBy,
} from '@openmsupply-client/common';
import { placeholderStocktake } from '../../utils';
import { StocktakeAction, Stocktake } from '../../types';

export interface StocktakeStateShape {
  draft: StocktakeController;
  sortBy: SortBy<StocktakeItem>;
}

const StocktakeActionCreator = {
  update: (key: string, value: string): StocktakeAction => {
    return {
      type: StocktakeActionType.Update,
      payload: { key, value },
    };
  },
  updateStocktakeDate: (newDate: Date | null): StocktakeAction => {
    return {
      type: StocktakeActionType.UpdateStocktakeDate,
      payload: { newDate },
    };
  },
};

export const getInitialState = (): StocktakeStateShape => ({
  draft: placeholderStocktake,
  sortBy: { key: 'itemName', isDesc: false, direction: 'asc' },
});

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
            ...data,
            lines: data?.lines.map(line => ({ ...line, lines: [] })) ?? [],
            update: (key: string, value: string) => {
              dispatch(StocktakeActionCreator.update(key, value));
            },
            updateStocktakeDate: (newDate: Date | null) => {
              dispatch(StocktakeActionCreator.updateStocktakeDate(newDate));
            },
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

        case StocktakeActionType.UpdateStocktakeDate: {
          const { payload } = action;
          const { newDate } = payload;
          state.draft.stocktakeDate = newDate;
          break;
        }
      }

      return state;
    }
  );
