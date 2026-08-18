import { t } from '../../../intl';
import type { StockMovementInfoFragment } from './stockMovementDetail.generated';

// Pure status logic for stock movements (spec/stock-movements/rules.md
// § status lifecycle + § editability + § status changes and the zero-line
// gate). Kept free of components so the behaviour-citing tests exercise it
// directly (cases/OMS-REG-SMV-10 .4, .6).

export type MovementStatus = StockMovementInfoFragment['status'];

// One flow, strictly forward; a change may skip CONFIRMED (rules § status
// lifecycle).
export const STATUS_FLOW = ['NEW', 'CONFIRMED', 'FINALISED'] as const;

export const statusIndex = (status: MovementStatus): number =>
  STATUS_FLOW.indexOf(status);

// Translated status labels, lazily read so a language switch re-labels
// (same getter shape as the return/stocktake status maps).
export const STATUS_LABELS: Record<string, string> = {
  get NEW() {
    return t('label.new');
  },
  get CONFIRMED() {
    return t('label.confirmed');
  },
  get FINALISED() {
    return t('label.finalised');
  },
};

export const statusLabel = (status: MovementStatus): string =>
  STATUS_LABELS[status] ?? status;

// The forward statuses offered from the current one (rules § status
// lifecycle): every later stage, in order — NEW may skip straight to
// FINALISED. Empty = terminal.
export const nextStatuses = (status: MovementStatus): MovementStatus[] =>
  STATUS_FLOW.slice(statusIndex(status) + 1) as MovementStatus[];

// Standing editability (rules § editability): NEW and CONFIRMED are equally
// editable — comment, lines, delete; only FINALISED disables. OMS-REG-SMV-10
// .26–.28 own the finalised-protection outcomes end-to-end.
export const isFinalised = (status: MovementStatus): boolean =>
  status === 'FINALISED';

// The UI-only zero-line gate (rules § status changes and the zero-line gate):
// ANY status change is blocked with a notice while the movement has no lines —
// a client-side superset of the server's finalise-only rule. The button stays
// clickable so the click explains itself (messages.no-lines dialog) rather
// than dead-ending. OMS-REG-SMV-10.4.
export const blockedByZeroLines = (node: { lineCount: number }): boolean =>
  node.lineCount === 0;

// Steps for the lifecycle indicator: each stage with the datetime it was
// reached (undefined = not reached yet). No preference narrows this flow.
export const statusSteps = (
  node: StockMovementInfoFragment
): { label: string; date?: string }[] => {
  const dates: Record<string, string | null | undefined> = {
    NEW: node.createdDatetime,
    CONFIRMED: node.confirmedDatetime,
    FINALISED: node.finalisedDatetime,
  };
  return STATUS_FLOW.map(status => ({
    label: statusLabel(status),
    date: dates[status] ?? undefined,
  }));
};

export const currentStep = (status: MovementStatus): number =>
  statusIndex(status);
