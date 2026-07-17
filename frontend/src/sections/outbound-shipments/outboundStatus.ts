import { t } from '../../intl';

// The outbound-shipment status lifecycle (spec/outbound-shipments rules.md §
// status lifecycle): NEW → ALLOCATED → PICKED → SHIPPED for the sending store,
// then the transfer-mirrored DELIVERED → RECEIVED → VERIFIED (never client-set
// — they arrive from the receiving side). Forward-only; SHIPPED is terminal
// for edits. CANCELLED sits outside the flow (a terminated record, list-only).
export const STATUS_FLOW = [
  'NEW',
  'ALLOCATED',
  'PICKED',
  'SHIPPED',
  'DELIVERED',
  'RECEIVED',
  'VERIFIED',
] as const;
export type OutboundStatus = (typeof STATUS_FLOW)[number];

// The statuses the sending store may confirm (UpdateOutboundShipmentStatusInput
// — NEW is unreachable by update, DELIVERED+ are transfer-mirrored only).
export const CLIENT_SETTABLE = ['ALLOCATED', 'PICKED', 'SHIPPED'] as const;
export type SettableStatus = (typeof CLIENT_SETTABLE)[number];

export const STATUS_LABELS: Record<OutboundStatus | 'CANCELLED', string> = {
  get NEW() {
    return t('outbound.status.new');
  },
  get ALLOCATED() {
    return t('outbound.status.allocated');
  },
  get PICKED() {
    return t('outbound.status.picked');
  },
  get SHIPPED() {
    return t('outbound.status.shipped');
  },
  get DELIVERED() {
    return t('outbound.status.delivered');
  },
  get RECEIVED() {
    return t('outbound.status.received');
  },
  get VERIFIED() {
    return t('outbound.status.verified');
  },
  get CANCELLED() {
    return t('outbound.status.cancelled');
  },
};

// StatusChip colour token per status (text + style, never colour alone —
// ui-standards/accessibility.md).
export const STATUS_COLOURS: Record<OutboundStatus | 'CANCELLED', string> = {
  NEW: 'var(--status-new)',
  ALLOCATED: 'var(--status-allocated)',
  PICKED: 'var(--status-picked)',
  SHIPPED: 'var(--status-shipped)',
  DELIVERED: 'var(--status-delivered)',
  RECEIVED: 'var(--status-received)',
  VERIFIED: 'var(--status-verified)',
  CANCELLED: 'var(--status-cancelled)',
};

export const statusLabel = (status: string): string =>
  STATUS_LABELS[status as OutboundStatus] ?? status;

export const statusColour = (status: string): string =>
  STATUS_COLOURS[status as OutboundStatus] ?? 'var(--status-new)';

// The current stage's index in the flow (−1 if not a flow member, e.g.
// CANCELLED).
export const statusIndex = (status: string): number =>
  STATUS_FLOW.indexOf(status as OutboundStatus);

// Editable while NEW / ALLOCATED / PICKED; read-only from SHIPPED (rules.md §
// editability). The status alone — the caller layers on-hold/customer-store
// concerns where relevant (on hold blocks only status changes, not edits).
export const isEditable = (status: string): boolean =>
  status === 'NEW' || status === 'ALLOCATED' || status === 'PICKED';

// A shipment is deletable exactly while it is editable (rules.md § deletion).
export const isDeletable = isEditable;
