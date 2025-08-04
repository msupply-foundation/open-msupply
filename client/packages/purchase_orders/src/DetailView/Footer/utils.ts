import {
  LocaleKey,
  PurchaseOrderNodeStatus,
  TypedTFunction,
} from '@openmsupply-client/common';
import { PurchaseOrderLineFragment } from '../../api';

export const purchaseOrderStatuses: PurchaseOrderNodeStatus[] = [
  PurchaseOrderNodeStatus.New,
  PurchaseOrderNodeStatus.Authorised,
  PurchaseOrderNodeStatus.Confirmed,
  PurchaseOrderNodeStatus.Finalised,
];

export const statusTranslation: Record<PurchaseOrderNodeStatus, LocaleKey> = {
  NEW: 'label.new',
  AUTHORISED: 'label.authorised',
  CONFIRMED: 'label.confirmed',
  FINALISED: 'label.finalised',
};

export const validateEmptyPurchaseOrder = (
  lines:
    | {
        totalCount: number;
        nodes: PurchaseOrderLineFragment[];
      }
    | undefined
): boolean => {
  if (!lines) return false;

  const noRequestedPackSize = lines.nodes.every(
    line => line.requestedPackSize === 0
  );
  if (lines.totalCount === 0 || noRequestedPackSize) return false;
  return true;
};

export const getStatusTranslator =
  (t: TypedTFunction<LocaleKey>) =>
  (status: PurchaseOrderNodeStatus): string =>
    t(
      statusTranslation[status] ??
        statusTranslation[PurchaseOrderNodeStatus.New]
    );
