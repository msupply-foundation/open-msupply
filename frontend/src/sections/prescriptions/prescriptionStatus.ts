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
 * prescribed-quantity placeholder lines — blocks the status button with a
 * notice and no server call (the one sanctioned client pre-flight; the server
 * would accept it, a captured gap).
 */
export const hasDispensedLines = (
  lines: readonly { type: string }[]
): boolean => lines.some(line => line.type === 'STOCK_OUT');

/**
 * The prescribed-quantity placeholder: the line the server mints to hold an
 * item's prescribed quantity while nothing is dispensed for it (contract ›
 * prescribed quantity — `UNALLOCATED_STOCK`, `packSize` 0, `numberOfPacks` 0,
 * no stock line). Absorbed into the dispensed line once stock is allocated.
 *
 * The same wire type as an outbound shipment's placeholder, but the
 * prescriptions flavour: never client-creatable (the shared service's
 * placeholder slot is hardcoded off here), it carries no requested quantity of
 * its own, and pack size is 0 rather than 1.
 */
export const isPlaceholderLine = (line: { type: string }): boolean =>
  line.type === 'UNALLOCATED_STOCK';

/**
 * The lines the detail table renders: what was dispensed, what a cancellation
 * reversal returned — the mirror holds the same lines retyped STOCK_IN, and
 * the item ledger's return movement opens that record (OMS-REG-DIS-04.33) —
 * and the prescribed-quantity placeholder.
 *
 * The placeholder renders, as it does in the current app: a non-dispensable
 * row carrying the item and its prescribed quantity, with no batch and no
 * prices. It must not be filtered out — recording a prescribed quantity for an
 * item with no stock then showed the user an EMPTY table, so a save that
 * worked looked like one that had failed, with nothing on screen to revisit or
 * delete. "Invisible as a dispensable line" (the reverse-spec's AC-Q1) means
 * it is not a dispensed batch, not that it is unrendered: the status guard
 * ignores it (hasDispensedLines) and its quantity/money cells stay empty.
 */
export const isRenderableLine = (line: { type: string }): boolean =>
  line.type === 'STOCK_OUT' ||
  line.type === 'STOCK_IN' ||
  isPlaceholderLine(line);

/**
 * The lines that record a batch this item was dispensed FROM — the rows of the
 * read-only line modal's batch grid. Deliberately NOT isRenderableLine: "renders
 * as a line-table row" and "was dispensed from a batch" are different questions,
 * and the prescribed-quantity placeholder answers them differently. It has no
 * stock line, so as a batch row it would be all but empty; the grid's section
 * is hidden instead.
 */
export const isBatchLine = (line: { type: string }): boolean =>
  isRenderableLine(line) && !isPlaceholderLine(line);

/**
 * Zero-quantity rows that a status confirmation warns about and the change
 * removes (AC-S5).
 */
export const zeroQuantityLineCount = (
  lines: readonly { type: string; numberOfPacks: number }[]
): number =>
  lines.filter(line => line.type === 'STOCK_OUT' && line.numberOfPacks === 0)
    .length;
