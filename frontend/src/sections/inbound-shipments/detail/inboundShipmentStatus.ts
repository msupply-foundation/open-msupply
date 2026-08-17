import { t } from '../../../intl';
import type { InboundInfoFragment } from './inboundShipmentDetail.generated';

// The inbound-shipment status lifecycle (spec/inbound-shipments › status
// lifecycle). Which stages appear depends on the shipment's KIND — the user
// only ever advances forward through its kind's sequence:
//   Manual (external/internal)
//     New → Delivered → Received → Verified
//   From a purchase order
//     New → Shipped → Delivered → Received → Verified
//   Transfer (requisition/link)
//     New → Picked → Shipped → Delivered → Received → Verified
//
// Shared by the list status chip, the detail status footer's StatusIndicator
// (renders every stage), and the status-change split button (offers every
// later reachable status). Status is forward-only and never reverses.

export type InboundStatus =
  'NEW' | 'PICKED' | 'SHIPPED' | 'DELIVERED' | 'RECEIVED' | 'VERIFIED';

export type ShipmentKind = 'manual' | 'purchaseOrder' | 'transfer';

// Origin classification for status-flow purposes. `inboundType` is the
// server-computed authority (contract → origin); a transfer is a requisition
// origin OR a bare shipment-to-shipment link (the MANUAL_INTERNAL + linked
// wire trap), so we treat a present linkedShipment as a transfer too.
export const kindOf = (info: {
  inboundType: InboundInfoFragment['inboundType'];
  linkedShipment?: { id: string } | null;
}): ShipmentKind => {
  if (info.inboundType === 'FROM_REQUISITION' || info.linkedShipment)
    return 'transfer';
  if (info.inboundType === 'FROM_PURCHASE_ORDER') return 'purchaseOrder';
  return 'manual';
};

const FLOWS: Record<ShipmentKind, InboundStatus[]> = {
  manual: ['NEW', 'DELIVERED', 'RECEIVED', 'VERIFIED'],
  purchaseOrder: ['NEW', 'SHIPPED', 'DELIVERED', 'RECEIVED', 'VERIFIED'],
  transfer: ['NEW', 'PICKED', 'SHIPPED', 'DELIVERED', 'RECEIVED', 'VERIFIED'],
};

// The ordered stages shown for a shipment of this kind. If the actual status
// somehow falls outside the kind's nominal flow, it's spliced in so the track
// never hides the current stage.
export const statusFlow = (
  kind: ShipmentKind,
  current: string
): InboundStatus[] => {
  const flow = FLOWS[kind];
  return flow.includes(current as InboundStatus) ? flow : FLOWS.transfer; // widest flow as a safe fallback
};

export const statusIndex = (flow: InboundStatus[], status: string): number =>
  flow.indexOf(status as InboundStatus);

// The kind's flow narrowed to the statuses the invoice-status-options
// preference offers (spec § preference gates — a display gate on EVERY status
// surface, the lifecycle indicator included). Empty = no restriction (the
// permissive not-yet-loaded default). Same shape as the returns verticals'
// offeredFlow.
export const offeredFlow = (
  kind: ShipmentKind,
  current: string,
  allowed: readonly string[]
): InboundStatus[] =>
  statusFlow(kind, current).filter(
    s => allowed.length === 0 || allowed.includes(s)
  );

// The indicator's current stage within the OFFERED flow. When the preference
// hides the actual status, the current stage falls back to the nearest
// offered status at-or-before it (OMS-REG-REPL-03.26 — the current app's
// getPreviousStatus fallback). −1 when nothing at-or-before is offered.
export const currentStep = (
  kind: ShipmentKind,
  status: string,
  allowed: readonly string[]
): number => {
  const flow = statusFlow(kind, status);
  const actual = statusIndex(flow, status);
  const offered = offeredFlow(kind, status, allowed);
  let current = -1;
  offered.forEach((s, i) => {
    if (statusIndex(flow, s) <= actual) current = i;
  });
  return current;
};

// Filter the advance targets by the invoice-status-options preference (spec §
// preference gates — a display gate only; the server accepts a status the
// preference hides). Empty = no restriction.
export const filterByStatusPreference = (
  targets: InboundStatus[],
  allowed: readonly string[]
): InboundStatus[] =>
  allowed.length === 0 ? targets : targets.filter(s => allowed.includes(s));

export const STATUS_LABELS: Record<InboundStatus, string> = {
  get NEW() {
    return t('label.new');
  },
  get PICKED() {
    return t('label.picked');
  },
  get SHIPPED() {
    return t('label.shipped');
  },
  get DELIVERED() {
    return t('label.delivered');
  },
  get RECEIVED() {
    return t('label.received');
  },
  get VERIFIED() {
    return t('label.verified');
  },
};

// Status → chip colour token (spec S1 status column). One dedicated
// --status-<name> token per stage (tokens.css).
export const statusColour = (status: string): string => {
  switch (status) {
    case 'PICKED':
      return 'var(--status-picked)';
    case 'SHIPPED':
      return 'var(--status-shipped)';
    case 'DELIVERED':
      return 'var(--status-delivered)';
    case 'RECEIVED':
      return 'var(--status-received)';
    case 'VERIFIED':
      return 'var(--status-verified)';
    default:
      return 'var(--status-new)';
  }
};

export const statusLabel = (status: string): string =>
  STATUS_LABELS[status as InboundStatus] ?? status;

// The statuses whose header fields, lines and custom fields take edits.
// Picked belongs to the transfer processor, which owns the shipment until it
// hands off at Shipped (processors/transfer/invoice/update_inbound_invoice.rs);
// Shipped means the goods have left the sender; Verified is terminal.
//
// This is the client's own rule — editability is not a field the server hands
// us, so it is stated here whatever the server happens to accept.
const EDITABLE: InboundStatus[] = ['NEW', 'DELIVERED', 'RECEIVED'];

export const isEditable = (status: string): boolean =>
  EDITABLE.includes(status as InboundStatus);

// Whether the status footer offers an advance — a SEPARATE, deliberately looser
// gate than `isEditable`. An advance travels through updateInboundShipment, so
// reusing the edit gate would strand a Shipped shipment with no route to
// Delivered. Only Verified, the terminal status, closes it.
export const canChangeStatus = (status: string): boolean =>
  status !== 'VERIFIED';

// The statuses the user may advance to from here: forward-only, and only the
// four the UpdateInboundShipmentStatusInput enum accepts (PICKED is set by the
// transfer processor, never by a client). The split button offers these; the
// server is the final authority (advances are submitted, not pre-validated).
const SETTABLE: InboundStatus[] = [
  'SHIPPED',
  'DELIVERED',
  'RECEIVED',
  'VERIFIED',
];

export const reachableStatuses = (
  kind: ShipmentKind,
  current: string
): InboundStatus[] => {
  const flow = statusFlow(kind, current);
  const currentIdx = statusIndex(flow, current);
  return flow.filter((s, i) => i > currentIdx && SETTABLE.includes(s));
};

// The per-stage timestamp used by the StatusIndicator history popover. On a
// transfer, Picked and Shipped are the SENDING store's timestamps — the server
// copies them across when it generates this shipment, so they are present from
// the moment it appears here rather than stamped by any local advance.
export const statusDatetime = (
  info: Pick<
    InboundInfoFragment,
    | 'createdDatetime'
    | 'pickedDatetime'
    | 'shippedDatetime'
    | 'deliveredDatetime'
    | 'receivedDatetime'
    | 'verifiedDatetime'
  >,
  status: InboundStatus
): string | null | undefined => {
  switch (status) {
    case 'NEW':
      return info.createdDatetime;
    case 'PICKED':
      return info.pickedDatetime;
    case 'SHIPPED':
      return info.shippedDatetime;
    case 'DELIVERED':
      return info.deliveredDatetime;
    case 'RECEIVED':
      return info.receivedDatetime;
    case 'VERIFIED':
      return info.verifiedDatetime;
    default:
      return undefined;
  }
};

// Whether the shipment's supplier (other party) is itself another store in the
// system, as opposed to an external supplier. The authoritative signal is a
// non-null `store` on the other party — matching the NameSearch
// truck-vs-building convention (see src/domain/name/nameResource.ts). Drives
// the list + toolbar kind icon (building vs truck, spec S1 column 1), the
// change-currency gate, and cost locking. NB: this is NOT the same as the
// shipment's origin/kind — a PO-linked shipment can still be against an
// external supplier (so it is a truck, not a building).
export const supplierIsStore = (row: {
  otherParty: { store?: { id: string } | null };
}): boolean => row.otherParty.store != null;
