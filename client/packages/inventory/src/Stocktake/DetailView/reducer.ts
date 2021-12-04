import { Dispatch } from 'react';
import {
  produce,
  DocumentActionSet,
  DocumentActionType,
  SortBy,
  StocktakeNodeStatus,
} from '@openmsupply-client/common';
import {
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

const StocktakeActionCreator = {
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
            updateStocktakeDatetime: (newDate: Date | null) => {
              dispatch(StocktakeActionCreator.updateStocktakeDatetime(newDate));
            },
            updateOnHold: () => {
              dispatch(StocktakeActionCreator.updateOnHold());
            },
            updateStatus: (newStatus: StocktakeNodeStatus) =>
              dispatch(StocktakeActionCreator.updateStatus(newStatus)),
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
      }

      return state;
    }
  );
