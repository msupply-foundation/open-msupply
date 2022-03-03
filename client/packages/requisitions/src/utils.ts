import {
  RequisitionNodeStatus,
  LocaleKey,
  useTranslation,
  RequisitionNodeType,
} from '@openmsupply-client/common';
import { RequestRowFragment } from './RequestRequisition/api';

export const requestStatuses = [
  RequisitionNodeStatus.Draft,
  RequisitionNodeStatus.Sent,
  RequisitionNodeStatus.Finalised,
];

// TODO: When response requisitions can be manually created, the status of DRAFT
// becomes possible and such will need to be handled.
export const responseStatuses = [
  RequisitionNodeStatus.New,
  RequisitionNodeStatus.Finalised,
];

const requisitionStatusToLocaleKey: Record<RequisitionNodeStatus, LocaleKey> = {
  [RequisitionNodeStatus.Draft]: 'label.draft',
  [RequisitionNodeStatus.New]: 'label.new',
  [RequisitionNodeStatus.Sent]: 'label.sent',
  [RequisitionNodeStatus.Finalised]: 'label.finalised',
};

export const getStatusTranslation = (status: RequisitionNodeStatus) => {
  return requisitionStatusToLocaleKey[status];
};

export const getRequisitionTranslator =
  (t: ReturnType<typeof useTranslation>) =>
  (currentStatus: RequisitionNodeStatus): string =>
    t(getStatusTranslation(currentStatus));

export const getRequestRequisitionStatuses = (): RequisitionNodeStatus[] => [
  RequisitionNodeStatus.Draft,
  RequisitionNodeStatus.New,
  RequisitionNodeStatus.Sent,
];

export const getResponseRequisitionStatuses = (): RequisitionNodeStatus[] => [
  RequisitionNodeStatus.New,
  RequisitionNodeStatus.Finalised,
];

export const getNextRequestStatus = (
  currentStatus: RequisitionNodeStatus
): RequisitionNodeStatus | null => {
  const currentStatusIdx = requestStatuses.findIndex(
    status => currentStatus === status
  );
  const nextStatus = requestStatuses[currentStatusIdx + 1];
  return nextStatus ?? null;
};

export const getNextResponseRequisitionStatus = (
  currentStatus: RequisitionNodeStatus
): RequisitionNodeStatus | null => {
  const currentStatusIdx = responseStatuses.findIndex(
    status => currentStatus === status
  );
  const nextStatus = responseStatuses[currentStatusIdx + 1];
  return nextStatus ?? null;
};

export const canDeleteRequest = (requisitionRow: RequestRowFragment): boolean =>
  requisitionRow.status === RequisitionNodeStatus.Draft &&
  requisitionRow.type === RequisitionNodeType.Request;
