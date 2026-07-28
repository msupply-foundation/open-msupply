import { t } from '../../../intl';
import type { SupplierReturnInfoFragment } from './supplierReturnDetail.generated';

// Pure status/editability logic for supplier returns
// (spec/supplier-returns/rules.md § status lifecycle + § editability). Kept free
// of components so the behaviour-citing tests exercise it directly
// (OMS-REG-REPL-06 .17/.18/.34/.36, OMS-FUN-SRN-001 .6).

export type ReturnStatus = SupplierReturnInfoFragment['status'];

// The lifecycle indicator's fixed sequence (rules § status lifecycle): a supplier
// return at THIS store only ever reaches NEW → PICKED → SHIPPED (forward-only);
// RECEIVED and VERIFIED belong to the transfer counterpart and appear for display
// only — never advance targets here.
export const STATUS_FLOW = [
  'NEW',
  'PICKED',
  'SHIPPED',
  'RECEIVED',
  'VERIFIED',
] as const;

export const statusIndex = (status: ReturnStatus): number =>
  (STATUS_FLOW as readonly string[]).indexOf(status);

// Translated status labels, lazily read so a language switch re-labels
// (same getter shape as customer returns / the stocktake status map).
export const STATUS_LABELS: Record<string, string> = {
  get NEW() {
    return t('status.new');
  },
  get PICKED() {
    return t('status.picked');
  },
  get SHIPPED() {
    return t('status.shipped');
  },
  get RECEIVED() {
    return t('status.received');
  },
  get VERIFIED() {
    return t('status.verified');
  },
};

export const statusLabel = (status: ReturnStatus): string =>
  STATUS_LABELS[status] ?? status;

// The wire can only advance to PICKED or SHIPPED
// (UpdateSupplierReturnStatusInput — contract § status lifecycle).
export type AdvanceTarget = 'PICKED' | 'SHIPPED';

// The forward statuses offered from the current one (rules § status lifecycle):
// both forward confirmations from NEW — a NEW return MAY go straight to SHIPPED,
// skipping PICKED; only SHIPPED remains from PICKED; nothing once SHIPPED
// (terminal for this store). Never backwards, so reversal is not expressible.
export const nextStatuses = (status: ReturnStatus): AdvanceTarget[] => {
  if (status === 'NEW') return ['PICKED', 'SHIPPED'];
  if (status === 'PICKED') return ['SHIPPED'];
  return [];
};

// Standing editability (rules § editability): header fields, lines, hold toggle,
// status advance, and delete are available while the return is NEW or PICKED;
// SHIPPED is terminal for this store (everything disabled). The disabled-
// supplier-store gate is server-enforced only (not derivable from the node).
export const isReturnDisabled = (node: { status: ReturnStatus }): boolean =>
  node.status !== 'NEW' && node.status !== 'PICKED';

// The supplier field is additionally frozen once the return records an
// originating inbound shipment — the link is set at creation and never editable
// (rules § from an originating inbound shipment / § header rules).
export const hasOriginalShipment = (node: {
  originalShipment?: { id: string } | null;
}): boolean => !!node.originalShipment?.id;

// The status button's own gate (rules § advancing status — preconditions): hold
// blocks ONLY status changes; the no-lines block is handled at the call site
// (both also server-enforced). Hold is releasable in the same save that advances
// (rules § advancing status — preconditions).
export const advanceBlockedByHold = (node: { onHold: boolean }): boolean =>
  node.onHold;

// The flow narrowed to the statuses the invoice-status-options preference offers
// (rules § preference gates — a display gate on EVERY status surface, the
// lifecycle indicator included). Empty = no restriction.
export const offeredFlow = (allowed: readonly string[]): ReturnStatus[] =>
  (STATUS_FLOW as readonly ReturnStatus[]).filter(
    s => allowed.length === 0 || allowed.includes(s)
  );

// Steps for the lifecycle indicator: each OFFERED stage with the datetime it was
// reached (undefined = not reached yet). RECEIVED/VERIFIED datetimes are the
// transfer counterpart's and are null on this return unless a counterpart set
// them — shown for display.
export const statusSteps = (
  node: SupplierReturnInfoFragment,
  allowed: readonly string[] = []
): { label: string; date?: string }[] => {
  const dates: Record<string, string | null | undefined> = {
    NEW: node.createdDatetime,
    PICKED: node.pickedDatetime,
    SHIPPED: node.shippedDatetime,
    RECEIVED: node.receivedDatetime,
    VERIFIED: node.verifiedDatetime,
  };
  return offeredFlow(allowed).map(status => ({
    label: statusLabel(status),
    date: dates[status] ?? undefined,
  }));
};

// The indicator's current stage within the OFFERED flow. When the preference
// hides the actual status, the current stage falls back to the nearest offered
// status at-or-before it. −1 when nothing at-or-before is offered.
export const currentStep = (
  status: ReturnStatus,
  allowed: readonly string[] = []
): number => {
  const actual = statusIndex(status);
  const offered = offeredFlow(allowed);
  let current = -1;
  offered.forEach((s, i) => {
    if (statusIndex(s) <= actual) current = i;
  });
  return current;
};

// Filter the offered targets by the store's invoice-status-options preference
// (rules § preference & permission gates — a display gate only). Empty = no
// restriction.
export const filterByStatusPreference = (
  targets: AdvanceTarget[],
  allowed: readonly string[]
): AdvanceTarget[] =>
  allowed.length === 0 ? targets : targets.filter(s => allowed.includes(s));
