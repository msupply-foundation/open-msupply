import type { DebouncedEdit } from '@/domain/debouncedEdit';
import type { UpdatePurchaseOrderVariables } from './purchaseOrderDetail.generated';

// Every as-you-type field on an order's own screen, in ONE debounced buffer
// owned by the detail view and handed to the toolbar, the Details tab and the
// side panel. One buffer, not three, because the rule is "fields touched
// together are saved together" (rules § an order's own screen) — a shared
// buffer coalesces a burst across all three surfaces into a single update.
//
// The three surfaces that are NOT here save the moment they change, so they
// never enter the buffer: the supplier, the requested delivery date, and the
// panel's three editable dates (same rule).
export type PurchaseOrderEditFields = {
  // Toolbar.
  reference: string;
  // Details tab — correspondence.
  authorisingOfficer1: string;
  authorisingOfficer2: string;
  additionalInstructions: string;
  supplierAgent: string;
  headingMessage: string;
  freightConditions: string;
  // Side panel — editable in every state, closed orders included, like the
  // panel's three dates (rules § what may be changed, and when).
  comment: string;
};

export type PurchaseOrderFieldEdit = DebouncedEdit<PurchaseOrderEditFields>;

/**
 * The patch shape every save on this screen takes — the update input, less its
 * id.
 */
export type PurchaseOrderPatch = Partial<
  Omit<UpdatePurchaseOrderVariables['input'], 'id'>
>;

/** What a save reports back: enough for a caller to show a verdict in place. */
export type SaveFieldResult = { ok: boolean; message?: string };

/*
 * The sent moment is a DateTime on the wire but a DAY on the screen (S9: the
 * panel shows and edits "PO sent" date-only). Its `NullableDatetimeUpdate`
 * parses a NAIVE `YYYY-MM-DDTHH:MM:SS`, read as UTC, and rejects any zone
 * suffix — yet the node hands the field back WITH `+00:00` (contract ⚠️ the
 * sent moment is written naive and read zoned). So a picked day is written as
 * UTC midnight, and the stored value is read back as its UTC day: the two are
 * symmetric, and the time component is never surfaced.
 */
export const sentDayToWire = (day: string): string => `${day}T00:00:00`;
export const sentWireToDay = (
  wire: string | null | undefined
): string | undefined => (wire ? wire.slice(0, 10) : undefined);
