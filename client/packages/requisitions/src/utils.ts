import {
  RequisitionNodeStatus,
  LocaleKey,
  useTranslation,
} from '@openmsupply-client/common';
import { Requisition } from './types';
import { ResponseRequisitionRowFragment } from './ResponseRequisition/api';

export const isRequisitionEditable = (requisition: Requisition): boolean => {
  return (
    requisition.status === RequisitionNodeStatus.Draft ||
    requisition.status === RequisitionNodeStatus.New
  );
};

const requisitionStatusToLocaleKey: Record<RequisitionNodeStatus, LocaleKey> = {
  [RequisitionNodeStatus.Draft]: 'label.draft',
  [RequisitionNodeStatus.New]: 'label.new',
  [RequisitionNodeStatus.Sent]: 'label.sent',
  [RequisitionNodeStatus.Finalised]: 'label.finalised',
};

// TODO: When supplier requisition statuses are finalised, this function should be passed
// `t` and should properly translate the status.
export const getRequestRequisitionTranslator =
  (t: ReturnType<typeof useTranslation>) =>
  (currentStatus: RequisitionNodeStatus): string =>
    t(requisitionStatusToLocaleKey[currentStatus]);

export const getRequestRequisitionStatuses = (): RequisitionNodeStatus[] => [
  RequisitionNodeStatus.Draft,
  RequisitionNodeStatus.New,
  RequisitionNodeStatus.Sent,
];

export const canDeleteRequisition = (
  requisitionRow: ResponseRequisitionRowFragment
): boolean => requisitionRow.status === RequisitionNodeStatus.Draft;

export const createStatusLog = (status: RequisitionNodeStatus) => {
  if (status === 'DRAFT') {
    return {
      DRAFT: new Date().toISOString(),
      NEW: null,
      FINALISED: null,
      SENT: null,
    };
  }

  if (status === 'FINALISED') {
    return {
      DRAFT: new Date().toISOString(),
      NEW: new Date().toISOString(),
      FINALISED: new Date().toISOString(),
      SENT: null,
    };
  }

  return {
    DRAFT: new Date().toISOString(),
    NEW: new Date().toISOString(),
    FINALISED: new Date().toISOString(),
    SENT: new Date().toISOString(),
  };
};

export const requestRequisitionStatuses = [
  RequisitionNodeStatus.Draft,
  RequisitionNodeStatus.Sent,
  RequisitionNodeStatus.Finalised,
];

// TODO: When response requisitions can be manually created, the status of DRAFT
// becomes possible and such will need to be handled.
export const responseRequisitionStatuses = [
  RequisitionNodeStatus.New,
  RequisitionNodeStatus.Sent,
  RequisitionNodeStatus.Finalised,
];

const statusTranslation: Record<RequisitionNodeStatus, LocaleKey> = {
  DRAFT: 'label.draft',
  NEW: 'label.new',
  SENT: 'label.sent',
  FINALISED: 'label.finalised',
};

export const getNextRequestRequisitionStatus = (
  currentStatus: RequisitionNodeStatus
): RequisitionNodeStatus | null => {
  const currentStatusIdx = requestRequisitionStatuses.findIndex(
    status => currentStatus === status
  );
  const nextStatus = requestRequisitionStatuses[currentStatusIdx + 1];
  return nextStatus ?? null;
};

export const getStatusTranslation = (status: RequisitionNodeStatus) => {
  return statusTranslation[status];
};
