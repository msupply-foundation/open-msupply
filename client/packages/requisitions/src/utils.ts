import {
  RequisitionNodeStatus,
  LocaleKey,
  useTranslation,
  RequisitionNodeType,
} from '@openmsupply-client/common';
import { ResponseRequisitionRowFragment } from './ResponseRequisition/api';
import { RequestRequisitionRowFragment } from './RequestRequisition/api';

export const requestRequisitionStatuses = [
  RequisitionNodeStatus.Draft,
  RequisitionNodeStatus.Sent,
  RequisitionNodeStatus.Finalised,
];

// TODO: When response requisitions can be manually created, the status of DRAFT
// becomes possible and such will need to be handled.
export const responseRequisitionStatuses = [
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

export const getNextRequestRequisitionStatus = (
  currentStatus: RequisitionNodeStatus
): RequisitionNodeStatus | null => {
  const currentStatusIdx = requestRequisitionStatuses.findIndex(
    status => currentStatus === status
  );
  const nextStatus = requestRequisitionStatuses[currentStatusIdx + 1];
  return nextStatus ?? null;
};

export const getNextResponseRequisitionStatus = (
  currentStatus: RequisitionNodeStatus
): RequisitionNodeStatus | null => {
  const currentStatusIdx = responseRequisitionStatuses.findIndex(
    status => currentStatus === status
  );
  const nextStatus = responseRequisitionStatuses[currentStatusIdx + 1];
  return nextStatus ?? null;
};

export const canDeleteRequisition = (
  requisitionRow: ResponseRequisitionRowFragment | RequestRequisitionRowFragment
): boolean =>
  requisitionRow.status === RequisitionNodeStatus.New &&
  requisitionRow.type === RequisitionNodeType.Request;
