import { Dispatch } from 'react';
import {
  produce,
  DocumentActionSet,
  DocumentActionType,
  SortBy,
  Name,
} from '@openmsupply-client/common';
import { placeholderSupplierRequisition } from '../../utils';
import {
  SupplierRequisition,
  SupplierRequisitionLine,
  Requisition,
  RequisitionAction,
  RequisitionActionType,
} from '../../types';

export interface SupplierRequisitionStateShape {
  draft: SupplierRequisition;
  sortBy: SortBy<SupplierRequisitionLine>;
}

const RequisitionActionCreator = {
  update: (key: string, value: string): RequisitionAction => {
    return {
      type: RequisitionActionType.Update,
      payload: { key, value },
    };
  },
  updateOtherParty: (value: Name): RequisitionAction => {
    return {
      type: RequisitionActionType.UpdateOtherParty,
      payload: { value },
    };
  },
  updateRequisitionDate: (value: Date | null): RequisitionAction => {
    return {
      type: RequisitionActionType.UpdateRequisitionDate,
      payload: { value },
    };
  },
};

export const getInitialState = (): SupplierRequisitionStateShape => ({
  draft: placeholderSupplierRequisition,
  sortBy: { key: 'itemName', isDesc: false, direction: 'asc' },
});

export const reducer = (
  data: Requisition = placeholderSupplierRequisition,
  dispatch: Dispatch<DocumentActionSet<RequisitionAction>> | null
): ((
  state: SupplierRequisitionStateShape | undefined,
  action: DocumentActionSet<RequisitionAction>
) => SupplierRequisitionStateShape) =>
  produce(
    (
      state: SupplierRequisitionStateShape = getInitialState(),
      action: DocumentActionSet<RequisitionAction>
    ) => {
      switch (action.type) {
        case DocumentActionType.Init: {
          return state;
        }

        case DocumentActionType.Merge: {
          state.draft = {
            ...state.draft,
            ...data,
          };

          state.draft.update = (key: string, value: string) => {
            dispatch?.(RequisitionActionCreator.update(key, value));
          };

          state.draft.updateRequisitionDate = (value: Date | null) => {
            dispatch?.(RequisitionActionCreator.updateRequisitionDate(value));
          };

          break;
        }

        case RequisitionActionType.UpdateOtherParty: {
          state.draft.otherParty = action.payload.value;
          break;
        }

        case RequisitionActionType.Update: {
          const { payload } = action;
          const { value, key } = payload;

          if (key === 'comment') {
            state.draft.comment = value as string;
          }
          if (key === 'color') {
            state.draft.color = value as string;
          }

          if (key === 'theirReference') {
            state.draft.theirReference = value as string;
          }

          break;
        }

        case RequisitionActionType.UpdateRequisitionDate: {
          state.draft.requisitionDate = action.payload.value;

          break;
        }
      }

      return state;
    }
  );
