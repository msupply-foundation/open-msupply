import { RequestRowFragment } from './RequestRequisition/api/operations.generated';
import {
  RequisitionNodeStatus,
  LocaleKey,
  useTranslation,
  TypedTFunction,
  Formatter,
  RequisitionNodeApprovalStatus,
  noOtherVariants,
  ModalMode,
} from '@openmsupply-client/common';
import {
  ResponseLineFragment,
  ResponseRowFragment,
} from './ResponseRequisition/api';
import { RequestLineFragment } from './RequestRequisition/api';

export const requestStatuses = [
  RequisitionNodeStatus.Draft,
  RequisitionNodeStatus.Sent,
  RequisitionNodeStatus.Finalised,
];

export const responseStatuses = [
  RequisitionNodeStatus.New,
  RequisitionNodeStatus.Finalised,
];

const requisitionStatusToLocaleKey: Record<RequisitionNodeStatus, LocaleKey> = {
  [RequisitionNodeStatus.Draft]: 'status.draft',
  [RequisitionNodeStatus.New]: 'status.new',
  [RequisitionNodeStatus.Sent]: 'status.sent',
  [RequisitionNodeStatus.Finalised]: 'status.finalised',
};

export const getStatusTranslation = (status: RequisitionNodeStatus) => {
  return requisitionStatusToLocaleKey[status];
};

export const getRequisitionTranslator =
  (t: ReturnType<typeof useTranslation>) =>
  (currentStatus: RequisitionNodeStatus): string =>
    t(getStatusTranslation(currentStatus));

export const getNextRequisitionStatus = (
  currentStatus: RequisitionNodeStatus,
  statusSequence: RequisitionNodeStatus[] = requestStatuses
): RequisitionNodeStatus | null => {
  const currentStatusIdx = statusSequence.indexOf(currentStatus);
  if (
    currentStatusIdx === -1 ||
    currentStatusIdx === statusSequence.length - 1
  ) {
    return null;
  }
  return statusSequence[currentStatusIdx + 1] ?? null;
};

export const isRequestDisabled = (request: RequestRowFragment): boolean => {
  return request.status !== RequisitionNodeStatus.Draft;
};

export const isResponseDisabled = (response: ResponseRowFragment): boolean => {
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
    t('label.name'),
    t('label.number'),
    t('label.created'),
    t('label.status'),
    t('label.comment'),
  ];

  const data = invoices.map(node => [
    node.otherPartyName,
    node.requisitionNumber,
    Formatter.csvDateTimeString(node.createdDatetime),
    node.status,
    node.comment,
  ]);
  return Formatter.csv({ fields, data });
};

export const responsesToCsv = (
  invoices: ResponseRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    t('label.name'),
    t('label.number'),
    t('label.created'),
    t('label.status'),
    t('label.comment'),
  ];

  const data = invoices.map(node => [
    node.otherPartyName,
    node.requisitionNumber,
    Formatter.csvDateTimeString(node.createdDatetime),
    node.status,
    node.comment,
  ]);
  return Formatter.csv({ fields, data });
};

export const isRequestLinePlaceholderRow = (
  row: RequestLineFragment
): boolean => row.requestedQuantity === 0;

export const isResponseLinePlaceholderRow = (
  row: ResponseLineFragment
): boolean => row.supplyQuantity === 0;

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
    case RequisitionNodeApprovalStatus.AutoApproved:
      return 'approval-status.auto-approved';
    case RequisitionNodeApprovalStatus.ApprovedByAnother:
      return 'approval-status.approved-by-another';
    case RequisitionNodeApprovalStatus.DeniedByAnother:
      return 'approval-status.denied-by-another';
    default:
      return noOtherVariants(approvalStatus);
  }
};

enum IndicatorColumnName {
  Comment = 'Comment',
  Value = 'Value',
}

export const indicatorColumnNameToLocal = (
  columnName: string,
  t: TypedTFunction<LocaleKey>
) => {
  switch (columnName) {
    case IndicatorColumnName.Comment:
      return t('label.comment');
    case IndicatorColumnName.Value:
      return t('label.value');
    default:
      return columnName;
  }
};

export const shouldDeleteLine = (
  mode: ModalMode | null,
  draftId?: string,
  isDisabled?: boolean
): boolean => {
  // Only delete lines when creating new entries
  return mode === ModalMode.Create && !!draftId && !isDisabled;
};
