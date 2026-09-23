import { t } from '../../../intl';
import type { InboundInfoFragment } from './inboundShipmentDetail.generated';

// The inbound-shipment status lifecycle (spec/inbound-shipments › status
// lifecycle). Which stages appear depends on the shipment's SOURCE LINK — the
// user only ever advances forward through its own sequence:
//   None — manual (external/internal), or linked only to an internal order
//     New → Delivered → Received → Verified
//   A purchase order
//     New → Shipped → Delivered → Received → Verified
//   A sending shipment (a transfer)
//     New → Picked → Shipped → Delivered → Received → Verified
//
// Shared by the list status chip, the detail status footer's StatusIndicator
// (renders every stage), and the status-change split button (offers every
// later reachable status). Status is forward-only and never reverses.

export type InboundStatus =
  'NEW' | 'PICKED' | 'SHIPPED' | 'DELIVERED' | 'RECEIVED' | 'VERIFIED';

// The link through which something outside this store supplies the shipment's
// prices and drives its status (rules § source link). NOT the shipment's origin
// ("kind"): `'none'` covers both a manual shipment and one linked only to an
// internal order, and deliberately does not spell either — naming it 'manual'
// is what conflated the two (issue #1132), since the list's Type filter calls
// an internal-order-linked shipment "From internal order", not "Manual".
export type SourceLink = 'none' | 'purchaseOrder' | 'transfer';

// A shipment's source link, read off its own links rather than its
// `inboundType`. Two different questions: `inboundType` answers where the
// shipment originated (and stays authoritative for the list's Type filter),
// while this answers what drives it.
//
// A requisition link ALONE is not a source link. A shipment created here and
// manually linked to an internal order is `inboundType: FROM_REQUISITION` with
// no linkedShipment, and the server refuses Shipped on it — its guard is
// exactly "no purchase order and no linked shipment" (_cannot set shipped
// status on a manual shipment_, whose name is narrower than the rule). So it
// gets the unlinked flow, and its banner says the status will not update
// automatically: nothing is driving it from the other side.
//
// Behaviours OMS-REG-REPL-03.11 / .12.
export const sourceLinkOf = (info: {
  inboundType: InboundInfoFragment['inboundType'];
  linkedShipment?: { id: string } | null;
}): SourceLink => {
  if (info.inboundType === 'FROM_PURCHASE_ORDER') return 'purchaseOrder';
  if (info.linkedShipment) return 'transfer';
  return 'none';
};

// Whether a shipment carries a source link at all — the predicate the EDIT
// gates want, where sourceLinkOf above answers which kind it is (the status
// flow needs the kind; an edit gate only needs "is there one").
//
// Both the cost price and the supplier-declared shipped figures are read-only
// whenever one is present, because something outside this store supplied them
// (spec rules → source link). NOT the same as "not manual": a shipment linked
// only to an internal order has no source link and stays fully editable.
//
// Takes the purchase-order half as a BOOLEAN rather than reading inboundType,
// because the detail view knows it from the permission SCOPE the record was
// fetched with — which cannot disagree with the record in hand, and is the
// predicate cost price has always used.
export const hasSourceLink = (
  isExternalScope: boolean,
  linkedShipment: { id: string } | null | undefined
): boolean => isExternalScope || !!linkedShipment;

const FLOWS: Record<SourceLink, InboundStatus[]> = {
  none: ['NEW', 'DELIVERED', 'RECEIVED', 'VERIFIED'],
  purchaseOrder: ['NEW', 'SHIPPED', 'DELIVERED', 'RECEIVED', 'VERIFIED'],
  transfer: ['NEW', 'PICKED', 'SHIPPED', 'DELIVERED', 'RECEIVED', 'VERIFIED'],
};

// The ordered stages shown for a shipment with this source link. If the actual
// status somehow falls outside the nominal flow, the widest flow stands in so
// the track never hides the current stage.
export const statusFlow = (
  link: SourceLink,
  current: string
): InboundStatus[] => {
  const flow = FLOWS[link];
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

// Whether the shipment has actually put stock on the shelf.
//
// Stock first exists at RECEIVED, never before: the SDL doc-comment claiming
// DELIVERED introduces it is wrong, and a line's `stockLine` is null through
// New/Shipped/Delivered (contract → what receiving does).
//
// Caveat carried deliberately: a line INSERTED while the shipment sits at
// Shipped is stocked immediately (mechanism 2), so such a shipment holds stock
// this predicate does not admit. That path needs a PO-linked or transfer
// shipment plus a line added after shipping, and the alternative — warning
// every Shipped/Delivered shipment — was wrong far more often than right.
const HAS_INTRODUCED_STOCK: InboundStatus[] = ['RECEIVED', 'VERIFIED'];

const hasIntroducedStock = (status: string): boolean =>
  HAS_INTRODUCED_STOCK.includes(status as InboundStatus);

// Whether DELETING the shipment would take that stock back out, which is what
// the delete confirmation warns about (rules → deletion).
//
// Holding stock is not enough. A Verified shipment is finalised, so its delete
// is refused outright (server invoice/inbound_shipment/delete/validate.rs →
// check_invoice_is_editable admits New/Shipped/Delivered/Received) — warning
// that its stock "will be removed as well" promises an outcome that cannot
// happen, and the user meets the finalised refusal instead. Nor is this a gate:
// delete stays offered and submitted at every status (issue #1134); the status
// only picks the copy. Shipped and Delivered hold no stock yet, so they get the
// plain confirmation too — telling someone their Shipped shipment "has already
// been received" was both false and alarming.
export const deleteRemovesStock = (status: string): boolean =>
  hasIntroducedStock(status) && status !== 'VERIFIED';

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
  link: SourceLink,
  current: string
): InboundStatus[] => {
  const flow = statusFlow(link, current);
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
