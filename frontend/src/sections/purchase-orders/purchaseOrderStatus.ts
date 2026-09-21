import { t } from '@/intl';
import type { LocaleKey } from '@/intl';

// The purchase-order lifecycle as the app presents it (spec/purchase-orders
// rules § the status lifecycle):
//
//   New → Ready for approval → Ready for sending → Sent → Finalised
//
// Two of the five stored names mislead, so nothing may render the enum: the
// third state is stored as "confirmed" but displays as **Ready for sending**
// (its key is `label.ready-to-send`, which matches neither), and
// REQUEST_APPROVAL displays as **Ready for approval** (ui-surface § status
// labels). This module is the one place that mapping lives — the list's chip,
// the status filter's options, the CSV export and the supplier detail's
// Purchase Orders tab all read it.
//
// Pure (no components), so node vitest covers the mapping and its fallback
// directly.

export type PurchaseOrderStatus =
  'NEW' | 'REQUEST_APPROVAL' | 'CONFIRMED' | 'SENT' | 'FINALISED';

// Status → its translated label key. Keyed by the enum so a new status value
// is a compile error rather than an unlabelled chip.
export const PO_STATUS_KEY: Record<PurchaseOrderStatus, LocaleKey> = {
  NEW: 'label.new',
  REQUEST_APPROVAL: 'label.ready-for-approval',
  CONFIRMED: 'label.ready-to-send',
  SENT: 'label.sent',
  FINALISED: 'label.finalised',
};

// The ladder in order — the status filter's options, so the select reads in
// lifecycle order rather than enum-declaration order.
export const PO_STATUSES: PurchaseOrderStatus[] = [
  'NEW',
  'REQUEST_APPROVAL',
  'CONFIRMED',
  'SENT',
  'FINALISED',
];

/** The locale key for a status (falling back to New for any unmapped value). */
export const poStatusLabelKey = (status: PurchaseOrderStatus): LocaleKey =>
  PO_STATUS_KEY[status] ?? PO_STATUS_KEY.NEW;

/** The translated status label, read lazily so a language switch re-labels. */
export const poStatusLabel = (status: PurchaseOrderStatus): string =>
  t(poStatusLabelKey(status));

// Status → chip colour (tokens.css --status-*). The tokens are named for the
// SHIPMENT lifecycle, so these are borrowed by hue, not by meaning: a grey
// start, a ramp through the two waiting states, and the terminal green. No
// state here is a warning, so the amber is deliberately not used. Meaning is
// carried by the chip's text, never by colour alone (WCAG).
const PO_STATUS_COLOUR: Record<PurchaseOrderStatus, string> = {
  NEW: 'var(--status-new)',
  REQUEST_APPROVAL: 'var(--status-delivered)',
  CONFIRMED: 'var(--status-allocated)',
  SENT: 'var(--status-shipped)',
  FINALISED: 'var(--status-finalised)',
};

export const poStatusColour = (status: PurchaseOrderStatus): string =>
  PO_STATUS_COLOUR[status] ?? PO_STATUS_COLOUR.NEW;

// The restricted-row marking (OMS-FUN-PO-15.10): a Sent or Finalised order is
// closed to change, and the list distinguishes those from the orders still
// being worked. A standing property of the record, so the list mirrors it
// (ui-standards/validation.md § the line between the two) — unlike
// deletability below.
export const isRowRestricted = (status: PurchaseOrderStatus): boolean =>
  status === 'SENT' || status === 'FINALISED';
