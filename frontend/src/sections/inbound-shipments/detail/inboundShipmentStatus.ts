import { t } from '../../../intl';
import type { InboundInfoFragment } from './inboundShipmentDetail.generated';
import type { InboundRowFragment } from '../list/inboundShipments.generated';

// The inbound-shipment status lifecycle (spec/inbound-shipments › status
// lifecycle). Which stages appear depends on the shipment's KIND — the user
// only ever advances forward through its kind's sequence:
//   Manual (external/internal): New → Delivered → Received → Verified
//   From a purchase order:      New → Shipped → Delivered → Received → Verified
//   Transfer (requisition/link):New → Picked → Shipped → Delivered → Received → Verified
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

// The per-stage timestamp used by the StatusIndicator history popover.
export const statusDatetime = (
  info: Pick<
    InboundInfoFragment,
    | 'createdDatetime'
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

// The kind icon shown before the supplier name (spec S1 column 1): a supplier
// that is itself another store gets the "home"/store glyph, an external
// supplier the truck. Derived from inboundType (MANUAL_INTERNAL/FROM_* imply a
// store-linked or system origin).
export const supplierIsStore = (
  row: Pick<InboundRowFragment, 'inboundType'>
): boolean => row.inboundType !== 'MANUAL_EXTERNAL';
