import { DefaultDocumentAction } from './../../../../common/src/hooks/useDocument/types';
import { SupplierRequisitionLine } from './../../types';

import {
  produce,
  DocumentActionSet,
  DocumentActionType,
  SortBy,
} from '@openmsupply-client/common';
import { placeholderSupplierRequisition } from '../../utils';
import { SupplierRequisition, Requisition } from '../../types';

export interface SupplierRequisitionStateShape {
  draft: SupplierRequisition;
  sortBy: SortBy<SupplierRequisitionLine>;
}

export const getInitialState = (): SupplierRequisitionStateShape => ({
  draft: placeholderSupplierRequisition,
  sortBy: { key: 'itemName', isDesc: false, direction: 'asc' },
});

export const reducer = (
  data: Requisition = placeholderSupplierRequisition
): ((
  state: SupplierRequisitionStateShape | undefined,
  action: DocumentActionSet<DefaultDocumentAction>
) => SupplierRequisitionStateShape) =>
  produce(
    (
      state: SupplierRequisitionStateShape = getInitialState(),
      action: DocumentActionSet<DefaultDocumentAction>
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

          break;
        }
      }

      return state;
    }
  );
