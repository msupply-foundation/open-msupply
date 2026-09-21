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
