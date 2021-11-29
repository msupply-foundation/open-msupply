import {
  RequisitionNode,
  RequisitionLineNode,
  Name,
} from '@openmsupply-client/common';

export interface Requisition
  extends Omit<RequisitionNode, '__typename' | 'lines' | 'otherParty'> {
  lines: RequisitionRow[];
  otherParty: Name;
}

export type RequisitionRow = Pick<RequisitionNode, 'id' | 'comment'>;

export interface SupplierRequisitionLine extends RequisitionLineNode {
  isUpdated?: boolean;
  isDeleted?: boolean;
  isCreated?: boolean;
}
export interface SupplierRequisition extends Requisition {
  isDeleted: boolean;
  otherParty: Name;
  lines: SupplierRequisitionLine[];
  update?: <K extends keyof Requisition>(key: K, value: Requisition[K]) => void;
  upsertLine?: (line: SupplierRequisitionLine) => void;
  deleteLine?: (line: SupplierRequisitionLine) => void;
}
