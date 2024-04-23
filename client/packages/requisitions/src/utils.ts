import {
  RequestLineFragment,
  RequestRowFragment,
} from './RequestRequisition/api/operations.generated';
import {
  RequisitionNodeStatus,
  LocaleKey,
  useTranslation,
  TypedTFunction,
  Formatter,
  RequisitionNodeApprovalStatus,
  noOtherVariants,
} from '@openmsupply-client/common';
import { ResponseRowFragment } from './ResponseRequisition/api';

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

export const isResponseDisabled = (response: RequestRowFragment): boolean => {
  return (
    response.status !== RequisitionNodeStatus.New ||
    response.approvalStatus === RequisitionNodeApprovalStatus.Pending ||
    response.approvalStatus === RequisitionNodeApprovalStatus.Denied
  );
};

export const requestsToCsv = (
  invoices: RequestRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.name'),
    t('label.number'),
    t('label.status'),
    t('label.created'),
    t('label.created'),
    t('label.reference'),
    t('label.comment'),
  ];

  const data = invoices.map(node => [
    node.id,
    node.otherPartyName,
    node.requisitionNumber,
    node.status,
    Formatter.csvDateTimeString(node.createdDatetime),
    node.theirReference,
    node.comment,
  ]);
  return Formatter.csv({ fields, data });
};

export const responsesToCsv = (
  invoices: ResponseRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.name'),
    t('label.number'),
    t('label.created'),
    t('label.status'),
    t('label.reference'),
    t('label.comment'),
  ];

  const data = invoices.map(node => [
    node.id,
    node.otherPartyName,
    node.requisitionNumber,
    Formatter.csvDateTimeString(node.createdDatetime),
    node.status,
    node.theirReference,
    node.comment,
  ]);
  return Formatter.csv({ fields, data });
};

export const isRequestLinePlaceholderRow = (
  row: RequestLineFragment
): boolean => row.requestedQuantity === 0;

export const getApprovalStatusKey = (
  approvalStatus?: RequisitionNodeApprovalStatus
): LocaleKey => {
  if (!approvalStatus) return 'approval-status.none';

  switch (approvalStatus) {
    case RequisitionNodeApprovalStatus.Approved:
      return 'approval-status.approved';
    case RequisitionNodeApprovalStatus.Denied:
      return 'approval-status.denied';
    case RequisitionNodeApprovalStatus.None:
      return 'approval-status.none';
    case RequisitionNodeApprovalStatus.Pending:
      return 'approval-status.pending';
    default:
      return noOtherVariants(approvalStatus);
  }
};
