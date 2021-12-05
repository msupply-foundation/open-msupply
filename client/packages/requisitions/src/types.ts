import {
  RequisitionNode,
  RequisitionLineNode,
  Name,
} from '@openmsupply-client/common';

export enum RequisitionActionType {
  Update = 'Requisition/Update',
  UpdateOtherParty = 'Requisition/UpdateOtherParty',
  UpdateOrderDate = 'Requisition/UpdateOrderDate',
  UpdateRequisitionDate = 'Requisition/UpdateRequisitionDate',
}

export type RequisitionAction =
  | {
      type: RequisitionActionType.Update;
      payload: { key: string; value: string };
    }
  | {
      type: RequisitionActionType.UpdateOtherParty;
      payload: { value: Name };
    }
  | {
      type: RequisitionActionType.UpdateOrderDate;
      payload: { value: Date };
    }
  | {
      type: RequisitionActionType.UpdateRequisitionDate;
      payload: { value: Date };
    };

export interface Requisition
  extends Omit<
    RequisitionNode,
    '__typename' | 'lines' | 'otherParty' | 'orderDate' | 'requisitionDate'
  > {
  lines: RequisitionLine[];
  otherParty: Name;
  orderDate: Date | null;
  requisitionDate: Date | null;
}

export interface RequisitionRow
  extends Pick<
    RequisitionNode,
    'id' | 'comment' | 'otherPartyName' | 'otherPartyId' | 'theirReference'
  > {
  color: string;
  orderDate: Date | null;
}

export interface SupplierRequisition extends Requisition {
  isDeleted: boolean;
  otherParty: Name;
  lines: SupplierRequisitionLine[];
  update: (key: string, value: string) => void;
  updateOtherParty: (value: Name) => void;
  upsertLine?: (line: SupplierRequisitionLine) => void;
  deleteLine?: (line: SupplierRequisitionLine) => void;
}

export interface CustomerRequisition extends Requisition {
  isDeleted: boolean;
  otherParty: Name;
  lines: CustomerRequisitionLine[];
  update: (key: string, value: string) => void;
  updateOtherParty: (value: Name) => void;
  updateOrderDate: (value: Date) => void;
  updateRequisitionDate: (value: Date) => void;
  upsertLine?: (line: CustomerRequisitionLine) => void;
  deleteLine?: (line: CustomerRequisitionLine) => void;
}

export type RequisitionLine = Omit<RequisitionLineNode, '__typename'>;
export interface SupplierRequisitionLine extends RequisitionLineNode {
  isUpdated?: boolean;
  isDeleted?: boolean;
  isCreated?: boolean;
}

export interface CustomerRequisitionLine extends RequisitionLineNode {
  isUpdated?: boolean;
  isDeleted?: boolean;
  isCreated?: boolean;
}
