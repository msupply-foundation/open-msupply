import {
  LocaleKey,
  PurchaseOrderNodeStatus,
  TypedTFunction,
} from '@openmsupply-client/common';
import { PurchaseOrderLineFragment } from '../../api';

export const purchaseOrderStatuses: PurchaseOrderNodeStatus[] = [
  PurchaseOrderNodeStatus.New,
  PurchaseOrderNodeStatus.RequestApproval,
  PurchaseOrderNodeStatus.Confirmed,
  PurchaseOrderNodeStatus.Sent,
  PurchaseOrderNodeStatus.Finalised,
];

export const statusTranslation: Record<PurchaseOrderNodeStatus, LocaleKey> = {
  NEW: 'label.new',
  REQUEST_APPROVAL: 'label.ready-for-approval',
  CONFIRMED: 'label.ready-to-send',
  SENT: 'label.sent',
  FINALISED: 'label.finalised',
};

export const hasValidPurchaseOrderLines = (
  lines:
    | {
        totalCount: number;
        nodes: PurchaseOrderLineFragment[];
      }
    | undefined
): boolean => {
  if (!lines) return false;

  const includesEmptyLines = lines.nodes.some(
    line => line.requestedNumberOfUnits === 0
  );

  if (lines.totalCount === 0 || includesEmptyLines) return false;
  return true;
};

export const getStatusTranslator =
  (t: TypedTFunction<LocaleKey>) =>
  (status: PurchaseOrderNodeStatus): string =>
    t(
      statusTranslation[status] ??
        statusTranslation[PurchaseOrderNodeStatus.New]
    );
