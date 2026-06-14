import { RequisitionNodeStatus, RequisitionNodeType } from '@/gql/schema';

// Requisition status model, mirroring legacy requisitions/src/utils.ts. Request
// (internal order): Draft -> Sent -> Finalised, advanced to Sent here. Response
// (customer requisition): New -> Finalised.
export interface RequisitionFlow {
  sequence: RequisitionNodeStatus[];
  next: Partial<Record<RequisitionNodeStatus, RequisitionNodeStatus[]>>;
  editable: RequisitionNodeStatus[];
}

const R = RequisitionNodeStatus;

const REQUEST: RequisitionFlow = {
  sequence: [R.Draft, R.Sent, R.Finalised],
  next: { [R.Draft]: [R.Sent] },
  editable: [R.Draft],
};

const RESPONSE: RequisitionFlow = {
  sequence: [R.New, R.Finalised],
  next: { [R.New]: [R.Finalised] },
  editable: [R.New],
};

export function requisitionStatusFlow(type: RequisitionNodeType): RequisitionFlow {
  return type === RequisitionNodeType.Request ? REQUEST : RESPONSE;
}

export const isRequisitionEditable = (
  type: RequisitionNodeType,
  status: RequisitionNodeStatus,
): boolean => requisitionStatusFlow(type).editable.includes(status);

interface RequisitionDatetimes {
  createdDatetime: string;
  sentDatetime?: string | null;
  finalisedDatetime?: string | null;
}

export const requisitionReachedAt = (
  r: RequisitionDatetimes,
): Partial<Record<RequisitionNodeStatus, string | null>> => ({
  [R.Draft]: r.createdDatetime,
  [R.New]: r.createdDatetime,
  [R.Sent]: r.sentDatetime,
  [R.Finalised]: r.finalisedDatetime,
});
