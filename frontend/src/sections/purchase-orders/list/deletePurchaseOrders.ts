import type { GraphqlResult } from '@/api/graphql';
import type { DeletePurchaseOrderResult } from './purchaseOrders.generated';

// Pure logic behind the list's delete flow (spec/purchase-orders S3). There is
// no batch mutation: a multi-select delete is N independent deletePurchaseOrder
// calls (contract § deleting an order from the list), each succeeding or
// failing on its own, so the dialog has to report a mixed outcome. These
// helpers map each call's discriminated result to an outcome and fold the
// outcomes into that report. t()-free, so node vitest covers them directly.

/**
 * One selected order, as the list hands it to the delete action: the id the
 * mutation needs, and the NUMBER that names it in the report. Carried together
 * because a selection outlives the page that showed it — the number is read off
 * the row as the id is selected, while it is still on screen, so an order
 * selected on an earlier page can still be named when the report comes back.
 */
export type PurchaseOrderSelection = {
  id: string;
  /** Absent only if the row was gone before its number could be read — the
   *  report then falls back to naming the order by id. */
  number?: number;
};

export type DeleteOutcome =
  /** OMS-FUN-PO-15.1 — the order (and its lines, .12) were removed. */
  | { kind: 'deleted'; id: string }
  /**
   * OMS-FUN-PO-15.11 — the typed CannotDeletePurchaseOrder: the order is past
   * Ready for approval, so the domain refuses it and the order stays in the
   * list. The server's description ("Cannot delete non-new purchase order") is
   * not a user-facing sentence, so the dialog says the rule in its own words
   * and names the order.
   */
  | { kind: 'notDeletable'; id: string }
  /**
   * Everything else, reported by count alone because nothing distinguishes the
   * causes:
   *   - RecordNotFound — typed, but it means the order is already gone;
   *   - an order an external inbound shipment points at (OMS-FUN-PO-15.13),
   *     which fails as a top-level `Internal error` because the guard exists
   *     only as a database foreign key (contract ⚠️, README defect 2). The
   *     user is NOT told a shipment is the reason — a genuine gap, carried as
   *     the spec records it rather than guessed at here.
   */
  | { kind: 'failed'; id: string };

/** Map one deletePurchaseOrder call's result to its outcome. */
export const deleteOutcome = (
  id: string,
  result: GraphqlResult<DeletePurchaseOrderResult>
): DeleteOutcome => {
  if (result.kind !== 'success') return { kind: 'failed', id };
  const response = result.data.deletePurchaseOrder;
  if (response.__typename === 'DeleteResponse') return { kind: 'deleted', id };
  return response.error.__typename === 'CannotDeletePurchaseOrder'
    ? { kind: 'notDeletable', id }
    : { kind: 'failed', id };
};

export type DeleteSummary = {
  deletedCount: number;
  /** The orders the domain refused, in selection order. */
  notDeletable: string[];
  /** Undifferentiated failures — reported by count only. */
  failedCount: number;
};

/**
 * Fold the per-order outcomes: a refused order never prevents the others being
 * deleted, so the report has to state both halves (the deletion is not
 * all-or-nothing — contract § deleting an order from the list).
 */
export const summariseOutcomes = (
  outcomes: DeleteOutcome[]
): DeleteSummary => ({
  deletedCount: outcomes.filter(o => o.kind === 'deleted').length,
  notDeletable: outcomes.filter(o => o.kind === 'notDeletable').map(o => o.id),
  failedCount: outcomes.filter(o => o.kind === 'failed').length,
});
