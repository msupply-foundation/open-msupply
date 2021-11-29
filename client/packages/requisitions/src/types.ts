import {
  RequisitionNode,
  RequisitionLineNode,
  Name,
} from '@openmsupply-client/common';

export enum RequisitionActionType {
  Update = 'Requisition/Update',
  UpdateOtherParty = 'Requisition/UpdateOtherParty',
}

export type RequisitionAction =
  | {
      type: RequisitionActionType.Update;
      payload: { key: string; value: string };
    }
  | {
      type: RequisitionActionType.UpdateOtherParty;
      payload: { value: Name };
    };

export interface Requisition
  extends Omit<RequisitionNode, '__typename' | 'lines' | 'otherParty'> {
  lines: RequisitionLine[];
  otherParty: Name;
}

export type RequisitionRow = Pick<RequisitionNode, 'id' | 'comment'>;

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
  lines: SupplierRequisitionLine[];
  update: (key: string, value: string) => void;
  updateOtherParty: (value: Name) => void;
  upsertLine?: (line: SupplierRequisitionLine) => void;
  deleteLine?: (line: SupplierRequisitionLine) => void;
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
