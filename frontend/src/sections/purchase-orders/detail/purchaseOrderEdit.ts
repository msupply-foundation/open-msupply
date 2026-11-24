import type { DebouncedEdit } from '@/domain/debouncedEdit';
import {
  calendarDateToInstant,
  instantToCalendarDate,
  type CalendarDate,
  type Instant,
} from '@/intl/calendarDate';
import type { UpdatePurchaseOrderVariables } from './purchaseOrderDetail.generated';

// Every as-you-type field on an order's own screen, in ONE debounced buffer
// owned by the detail view and handed to the toolbar, the Details tab and the
// side panel. One buffer, not three, because the rule is "fields touched
// together are saved together" (rules § an order's own screen) — a shared
// buffer coalesces a burst across all three surfaces into a single update.
//
// The surfaces that are NOT here save the moment they change, so they never
// enter the buffer: the supplier, the requested delivery date, and the panel's
// three editable dates (same rule).
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
  // Side panel — the one field editable in every state, closed orders
  // included (rules § what may be changed, and when).
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
 * panel shows it date-only, and takes it by hand until the order is Sent). Its
 * `NullableDatetimeUpdate` parses a NAIVE `YYYY-MM-DDTHH:MM:SS`, read as UTC,
 * and rejects any zone suffix — yet the node hands the field back WITH
 * `+00:00` (contract ⚠️ the sent moment is written naive and read zoned).
 *
 * It is an instant like every other moment, because on entry to Sent the
 * service stamps the real moment over whatever was typed. So it is read as
 * the LOCAL day it falls on — the day the list's Sent column shows — and a
 * picked day is written as its local midnight in UTC (the zone suffix dropped
 * for the naive parse), which reads back as the same day. Reading the UTC day
 * instead showed the day before for a store ahead of UTC that sent in its
 * morning (#2614).
 */
export const sentDayToWire = (day: CalendarDate): string =>
  calendarDateToInstant(day).slice(0, 19);
export const sentWireToDay = (
  wire: Instant | null | undefined
): CalendarDate | undefined => instantToCalendarDate(wire) ?? undefined;
