import { t } from '../../../intl';
import type { CustomerReturnInfoFragment } from './customerReturnDetail.generated';

// Pure status/kind logic for customer returns
// (spec/customer-returns/rules.md § manual vs transfer + § status lifecycle +
// § editability). Kept free of components so the AC-citing tests exercise it
// directly (acceptance.md AC-E7, AC-S4/S5, AC-T1, AC-D3).

// The InvoiceNodeStatus values a customer return passes through. DELIVERED is a
// legacy intermediate customer returns always skip (contract § status
// lifecycle) — it never appears in either flow.
export type ReturnStatus = CustomerReturnInfoFragment['status'];

// The kind is derived, permanent, and drives sequence + editability
// (rules § manual vs transfer): transfer ⇔ the return has a transfer
// counterpart.
export type ReturnKind = 'manual' | 'transfer';

export const returnKind = (node: {
  linkedShipment?: { id: string } | null;
}): ReturnKind => (node.linkedShipment?.id ? 'transfer' : 'manual');

// The lifecycle sequence shown per kind (rules § status lifecycle): manual
// New → Received → Verified; transfer additionally passes through the sending
// store's Picked/Shipped stages.
export const MANUAL_FLOW = ['NEW', 'RECEIVED', 'VERIFIED'] as const;
export const TRANSFER_FLOW = [
  'NEW',
  'PICKED',
  'SHIPPED',
  'RECEIVED',
  'VERIFIED',
] as const;

export const statusFlow = (kind: ReturnKind): readonly ReturnStatus[] =>
  kind === 'manual' ? MANUAL_FLOW : TRANSFER_FLOW;

export const statusIndex = (kind: ReturnKind, status: ReturnStatus): number =>
  statusFlow(kind).indexOf(status);

// Translated status labels, lazily read so a language switch re-labels
// (same getter shape as the stocktake status map).
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
  get DELIVERED() {
    return t('status.delivered');
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

// The wire can only advance to RECEIVED or VERIFIED
// (UpdateCustomerReturnStatusInput — contract § status lifecycle).
export type AdvanceTarget = 'RECEIVED' | 'VERIFIED';

// The forward statuses offered from the current one (rules § status
// lifecycle): both remaining confirmations, in order — a NEW manual return may
// go straight to VERIFIED, skipping RECEIVED; a transfer return becomes
// advanceable once SHIPPED. An empty list = no advance offered (terminal, or a
// transfer still before SHIPPED).
export const nextStatuses = (
  kind: ReturnKind,
  status: ReturnStatus
): AdvanceTarget[] => {
  if (status === 'VERIFIED') return [];
  if (kind === 'transfer' && (status === 'NEW' || status === 'PICKED'))
    return [];
  if (status === 'RECEIVED') return ['VERIFIED'];
  return ['RECEIVED', 'VERIFIED'];
};

// Standing editability (rules § editability): header fields, lines, hold,
// delete. A VERIFIED return is immutable; a transfer return is read-only until
// RECEIVED (the UI's conservative gate — the receive action itself is offered
// from SHIPPED via nextStatuses above). AC-E7 / AC-T1.
export const isReturnDisabled = (node: {
  status: ReturnStatus;
  linkedShipment?: { id: string } | null;
}): boolean => {
  if (node.status === 'VERIFIED') return true;
  if (returnKind(node) === 'transfer') return node.status !== 'RECEIVED';
  return false;
};

// The status button's own gate (rules § advancing status — preconditions):
// hold blocks ONLY status changes; no-lines blocks the advance (both also
// server-enforced — AC-S4 / AC-S5). The button stays clickable on no-lines so
// the click explains itself (messages.no-lines dialog) rather than dead-ending.
export const advanceBlockedByHold = (node: { onHold: boolean }): boolean =>
  node.onHold;

// Steps for the lifecycle indicator: every stage of the kind's flow with the
// datetime it was reached (undefined = not reached yet).
export const statusSteps = (
  kind: ReturnKind,
  node: CustomerReturnInfoFragment
): { label: string; date?: string }[] => {
  const dates: Record<string, string | null | undefined> = {
    NEW: node.createdDatetime,
    PICKED: node.pickedDatetime,
    SHIPPED: node.shippedDatetime,
    RECEIVED: node.receivedDatetime,
    VERIFIED: node.verifiedDatetime,
  };
  return statusFlow(kind).map(status => ({
    label: statusLabel(status),
    date: dates[status] ?? undefined,
  }));
};

// Filter the offered targets by the store's invoice-status-options preference
// (rules § preference & permission gates — a display gate only). An empty
// preference = no restriction. RECEIVED/VERIFIED are members of the same
// InvoiceNodeStatus enum the preference lists, so this is a plain includes.
export const filterByStatusPreference = (
  targets: AdvanceTarget[],
  allowed: readonly string[]
): AdvanceTarget[] =>
  allowed.length === 0 ? targets : targets.filter(s => allowed.includes(s));
