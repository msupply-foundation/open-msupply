import { t } from '../../intl';
import type { LocaleKey } from '../../intl';

// The prescription-order status vocabulary and its gates
// (spec/prescription-orders/rules.md § the lifecycle, § editability, §
// deletion). Pure — the screens read these; the server is the real guard.

/** The statuses an order can hold (contract.md § the lifecycle). */
export type PrescriptionOrderStatus = 'NEW' | 'READY_TO_DISPENSE' | 'DISPENSED';

// Narrow a wire value to the vocabulary, treating anything unexpected as the
// most locked-down state (the safe default).
export const asOrderStatus = (status: string): PrescriptionOrderStatus =>
  status === 'NEW' || status === 'READY_TO_DISPENSE' ? status : 'DISPENSED';

export const STATUS_LABEL_KEYS: Record<PrescriptionOrderStatus, LocaleKey> = {
  NEW: 'status.new',
  READY_TO_DISPENSE: 'status.ready-to-dispense',
  DISPENSED: 'status.dispensed',
};

export const statusLabel = (status: PrescriptionOrderStatus): string =>
  t(STATUS_LABEL_KEYS[status]);

/** Status → chip colour token (tokens.css --status-*). */
export const statusColour = (status: PrescriptionOrderStatus): string =>
  ({
    NEW: 'var(--status-new)',
    READY_TO_DISPENSE: 'var(--status-picked)',
    DISPENSED: 'var(--status-verified)',
  })[status];

/**
 * Everything — header, lines, deletion, the hand-over — is editable only
 * while New (rules § editability, § deletion; AC-N5/R3/D2).
 */
export const isEditable = (status: PrescriptionOrderStatus): boolean =>
  status === 'NEW';

/**
 * The lifecycle crumb steps (ui-surface S3 § status footer): New · Ready to
 * dispense · Dispensed, with recorded times feeding the history popover.
 */
export const statusSteps = (node: {
  createdDatetime: string;
  readyDatetime?: string | null;
  dispensedDatetime?: string | null;
}): { label: string; date?: string }[] => [
  { label: statusLabel('NEW'), date: node.createdDatetime },
  {
    label: statusLabel('READY_TO_DISPENSE'),
    date: node.readyDatetime ?? undefined,
  },
  {
    label: statusLabel('DISPENSED'),
    date: node.dispensedDatetime ?? undefined,
  },
];

export const statusIndex = (status: PrescriptionOrderStatus): number =>
  ({ NEW: 0, READY_TO_DISPENSE: 1, DISPENSED: 2 })[status];
