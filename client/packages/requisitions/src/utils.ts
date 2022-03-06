import { RequestRowFragment } from './RequestRequisition/api/operations.generated';
import {
  RequisitionNodeStatus,
  LocaleKey,
  useTranslation,
} from '@openmsupply-client/common';

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

export const getNextRequestStatus = (
  currentStatus: RequisitionNodeStatus
): RequisitionNodeStatus | null => {
  const currentStatusIdx = requestStatuses.findIndex(
    status => currentStatus === status
  );
  const nextStatus = requestStatuses[currentStatusIdx + 1];
  return nextStatus ?? null;
};

export const getNextResponseStatus = (
  currentStatus: RequisitionNodeStatus
): RequisitionNodeStatus | null => {
  const currentStatusIdx = responseStatuses.findIndex(
    status => currentStatus === status
  );
  const nextStatus = responseStatuses[currentStatusIdx + 1];
  return nextStatus ?? null;
};

export const isRequestDisabled = (request: RequestRowFragment): boolean => {
  return request.status !== RequisitionNodeStatus.Draft;
};

export const isResponseDisabled = (request: RequestRowFragment): boolean => {
  return request.status !== RequisitionNodeStatus.New;
};
