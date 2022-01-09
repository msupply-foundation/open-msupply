import {
  RequisitionNode,
  RequisitionLineNode,
  Name,
} from '@openmsupply-client/common';

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
    | 'id'
    | 'comment'
    | 'otherPartyName'
    | 'otherPartyId'
    | 'theirReference'
    | 'status'
  > {
  color: string;
  orderDate: Date | null;
}

export type RequisitionLine = Omit<RequisitionLineNode, '__typename'>;
