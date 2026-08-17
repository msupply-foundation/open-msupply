import { t } from '../../../intl';
import type { LocaleKey } from '../../../intl';
import type { SupplierPurchaseOrdersResult } from '../names.generated';

// Pure purchase-order status logic for the supplier detail's Purchase Orders
// tab (spec/names ui-surface.md S4 — the status column is translated;
// contract.md names PurchaseOrderNodeStatus). Kept free of components so the
// mapping + its fallback are unit-tested directly. The data is owned by the
// purchase-order vertical (cross-vertical, named not owned); this only labels
// its status enum.

export type PurchaseOrderStatus =
  SupplierPurchaseOrdersResult['purchaseOrders']['nodes'][number]['status'];

// Status → its translated label key (mirrors the current app's
// getStatusTranslator: NEW / Ready for approval / Ready for sending / Sent /
// Finalised). Keyed by the enum so a new status value is a compile error.
export const PO_STATUS_KEY: Record<PurchaseOrderStatus, LocaleKey> = {
  NEW: 'label.new',
  REQUEST_APPROVAL: 'label.ready-for-approval',
  CONFIRMED: 'label.ready-to-send',
  SENT: 'label.sent',
  FINALISED: 'label.finalised',
};

// The locale key for a status (falling back to NEW for any unmapped value —
// mirrors getStatusTranslator's `?? New`). Pure, so it's the unit under test.
export const poStatusLabelKey = (status: PurchaseOrderStatus): LocaleKey =>
  PO_STATUS_KEY[status] ?? PO_STATUS_KEY.NEW;

// The translated status label, read lazily so a language switch re-labels.
export const poStatusLabel = (status: PurchaseOrderStatus): string =>
  t(poStatusLabelKey(status));
