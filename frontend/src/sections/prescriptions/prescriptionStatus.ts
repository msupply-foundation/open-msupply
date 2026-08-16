import { t } from '../../intl';
import type { LocaleKey } from '../../intl';

// The prescription status vocabulary and its gates
// (spec/prescriptions/rules.md § status lifecycle, § editability, §
// cancellation, § deletion). Pure — the screens read these; the server is the
// real guard (the UI only mirrors, per IMPLEMENTING § rules for the build).

/** The statuses a prescription can actually hold (contract.md § lifecycle). */
export type PrescriptionStatus = 'NEW' | 'PICKED' | 'VERIFIED' | 'CANCELLED';

// The generated invoice status union is wider (shipment statuses share the
// enum); a prescription read off the wire narrows to the four real values,
// with anything unexpected treated as read-only (the safe default).
export const asPrescriptionStatus = (status: string): PrescriptionStatus =>
  status === 'NEW' || status === 'PICKED' || status === 'VERIFIED'
    ? status
    : 'CANCELLED';

export const STATUS_LABEL_KEYS: Record<PrescriptionStatus, LocaleKey> = {
  NEW: 'status.new',
  PICKED: 'status.picked',
  VERIFIED: 'status.verified',
  CANCELLED: 'status.cancelled',
};

export const statusLabel = (status: PrescriptionStatus): string =>
  t(STATUS_LABEL_KEYS[status]);

/** Status → chip colour token (tokens.css --status-*). */
export const statusColour = (status: PrescriptionStatus): string =>
  ({
    NEW: 'var(--status-new)',
    PICKED: 'var(--status-picked)',
    VERIFIED: 'var(--status-verified)',
    CANCELLED: 'var(--status-cancelled)',
  })[status];

/**
 * Read-only from VERIFIED (and CANCELLED) — every edit affordance's gate
 * (rules § editability; AC-S3). Cancellation is the one exception and has its
 * own gate below.
 */
export const isReadOnly = (status: PrescriptionStatus): boolean =>
  status === 'VERIFIED' || status === 'CANCELLED';

/**
 * Where a detail-table row selection leads once the prescription is read-only:
 * the item's catalogue detail on its Ledger tab (OMS-REG-DIS-03.72). While
 * editable there is no href — the selection opens the line editor instead
 * (.55).
 */
export const lineRowLedgerHref = (
  status: PrescriptionStatus,
  storeId: string,
  itemId: string
): string | undefined =>
  isReadOnly(status)
    ? `/${storeId}/catalogue/items/${itemId}?tab=ledger`
    : undefined;

/**
 * Deletable while editable — NEW/PICKED only (rules § deletion; AC-D1/D2).
 * The list's bulk delete pre-checks every selected row with this (AC-D3):
 * load-bearing, because the server batch is all-or-nothing AND misreports
 * rolled-back rows as deleted (contract wire trap).
 */
export const canDeletePrescription = (status: PrescriptionStatus): boolean =>
  status === 'NEW' || status === 'PICKED';

/**
 * Cancel is offered on VERIFIED only, and never on a cancellation reversal
 * (rules § cancellation; OMS-REG-DIS-04.29/.33). The reversal is itself a
 * VERIFIED prescription — the item ledger's stock-return row opens it — so the
 * status alone would offer a cancel the server always refuses.
 */
export const canCancelPrescription = (
  status: PrescriptionStatus,
  isCancellation: boolean
): boolean => status === 'VERIFIED' && !isCancellation;

/**
 * The status-change split button's option set: the allowed FORWARD transitions
 * only — the current status is never offered (D40), and CANCELLED is never a
 * button option (cancel is the side panel's action). NEW offers the skip
 * (AC-S4); read-only offers nothing (the button is hidden, D39).
 */
/** The statuses the update operation can set going FORWARD from the button. */
export type ForwardStatus = 'PICKED' | 'VERIFIED';

export const nextStatuses = (status: PrescriptionStatus): ForwardStatus[] => {
  switch (status) {
    case 'NEW':
      return ['PICKED', 'VERIFIED'];
    case 'PICKED':
      return ['VERIFIED'];
    case 'VERIFIED':
    case 'CANCELLED':
      return [];
  }
};

/**
 * The lifecycle crumb steps (AC-V2): New · Picked · Verified, with Cancelled
 * appearing only once the prescription is cancelled. Dates feed the history
 * popover.
 */
export const statusSteps = (node: {
  status: string;
  createdDatetime: string;
  pickedDatetime?: string | null;
  verifiedDatetime?: string | null;
  cancelledDatetime?: string | null;
}): { label: string; date?: string }[] => {
  const steps = [
    { label: statusLabel('NEW'), date: node.createdDatetime },
    { label: statusLabel('PICKED'), date: node.pickedDatetime ?? undefined },
    {
      label: statusLabel('VERIFIED'),
      date: node.verifiedDatetime ?? undefined,
    },
  ];
  if (asPrescriptionStatus(node.status) === 'CANCELLED')
    steps.push({
      label: statusLabel('CANCELLED'),
      date: node.cancelledDatetime ?? undefined,
    });
  return steps;
};

export const statusIndex = (status: PrescriptionStatus): number =>
  ({ NEW: 0, PICKED: 1, VERIFIED: 2, CANCELLED: 3 })[status];

/**
 * The prescription date — the backdated time when set, else creation (rules §
 * the list; AC-L1). The list column, default sort, and CSV all read this.
 */
export const prescriptionDateOf = (node: {
  backdatedDatetime?: string | null;
  createdDatetime: string;
}): string => node.backdatedDatetime ?? node.createdDatetime;

/**
 * The no-lines pre-flight (AC-S6): a prescription with no lines — or only
 * prescribed-quantity carrier lines — blocks the status button with a notice
 * and no server call (the one sanctioned client pre-flight; the server would
 * accept it, a captured gap).
 */
export const hasDispensedLines = (
  lines: readonly { type: string }[]
): boolean => lines.some(line => line.type === 'STOCK_OUT');

/**
 * The lines the detail table renders: what was dispensed, plus what a
 * cancellation reversal returned — the mirror holds the same lines retyped
 * STOCK_IN, and the item ledger's return movement opens that record
 * (OMS-REG-DIS-04.33). Prescribed-quantity carriers (UNALLOCATED_STOCK) never
 * render (AC-Q1).
 */
export const isRenderableLine = (line: { type: string }): boolean =>
  line.type === 'STOCK_OUT' || line.type === 'STOCK_IN';

/**
 * Zero-quantity rows that a status confirmation warns about and the change
 * removes (AC-S5).
 */
export const zeroQuantityLineCount = (
  lines: readonly { type: string; numberOfPacks: number }[]
): number =>
  lines.filter(line => line.type === 'STOCK_OUT' && line.numberOfPacks === 0)
    .length;
