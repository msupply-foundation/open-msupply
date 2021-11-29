import { RequisitionNode } from '@openmsupply-client/common';

export type Requisition = Omit<RequisitionNode, '__typename' | 'lines'>;

export type RequisitionRow = Pick<RequisitionNode, 'id' | 'comment'>;
