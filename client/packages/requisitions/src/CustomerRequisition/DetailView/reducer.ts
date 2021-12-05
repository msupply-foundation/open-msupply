import { CustomerRequisitionLine, RequisitionActionType } from '../../types';
import { Dispatch } from 'react';
import {
  produce,
  DocumentActionSet,
  DocumentActionType,
  SortBy,
  Name,
} from '@openmsupply-client/common';
import { placeholderCustomerRequisition } from '../../utils';
import {
  RequisitionAction,
  CustomerRequisition,
  Requisition,
} from '../../types';

export interface CustomerRequisitionStateShape {
  draft: CustomerRequisition;
  sortBy: SortBy<CustomerRequisitionLine>;
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
  updateOrderDate: (value: Date): RequisitionAction => {
    return {
      type: RequisitionActionType.UpdateOrderDate,
      payload: { value },
    };
  },
  updateRequisitionDate: (value: Date): RequisitionAction => {
    return {
      type: RequisitionActionType.UpdateRequisitionDate,
      payload: { value },
    };
  },
};

export const getInitialState = (): CustomerRequisitionStateShape => ({
  draft: placeholderCustomerRequisition,
  sortBy: { key: 'itemName', isDesc: false, direction: 'asc' },
});

export const reducer = (
  data: Requisition = placeholderCustomerRequisition,
  dispatch: Dispatch<DocumentActionSet<RequisitionAction>> | null
): ((
  state: CustomerRequisitionStateShape | undefined,
  action: DocumentActionSet<RequisitionAction>
) => CustomerRequisitionStateShape) =>
  produce(
    (
      state: CustomerRequisitionStateShape = getInitialState(),
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
            dispatch(RequisitionActionCreator.update(key, value));
          };

          state.draft.updateOrderDate = (value: Date) => {
            dispatch(RequisitionActionCreator.updateOrderDate(value));
          };

          state.draft.updateRequisitionDate = (value: Date) => {
            dispatch(RequisitionActionCreator.updateRequisitionDate(value));
          };

          state.draft.update = (key: string, value: string) => {
            dispatch(RequisitionActionCreator.update(key, value));
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

        case RequisitionActionType.UpdateOrderDate: {
          state.draft.orderDate = action.payload.value;
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
