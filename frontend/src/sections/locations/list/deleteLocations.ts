import type { GraphqlResult } from '../../../api/graphql';
import type { DeleteLocationResult } from './locations.generated';

// Pure logic behind the delete flow (spec/locations S3, FL4). There is no
// batch mutation: a multi-select delete is N independent deleteLocation calls
// (contract.md § deletion), each succeeding or failing on its own (OMS-REG-INV-01.33).
// These helpers map each call's discriminated result to an outcome and fold
// the outcomes into the report the dialog shows. t()-free so node vitest
// covers them (spec/IMPLEMENTING.md C1).

export type DeleteOutcome =
  /** OMS-REG-INV-01.21 — the location was removed. */
  | { kind: 'deleted'; id: string }
  /**
   * OMS-REG-INV-01.32 — the typed LocationInUse rejection, carrying the referencing
   * stock-line / invoice-line counts that block the delete.
   */
  | { kind: 'inUse'; id: string; stockLines: number; invoiceLines: number }
  /**
   * OMS-REG-INV-01.35 — an untyped failure: a location with stock-movement history fails
   * storage-side as a plain Internal-error GraphQL error (not the in-use
   * report); wrong-store / not-found also arrive untyped (contract.md ⚠️ wire
   * trap). The location remains.
   */
  | { kind: 'failed'; id: string };

/** Map one deleteLocation call's result to its outcome. */
export const deleteOutcome = (
  id: string,
  result: GraphqlResult<DeleteLocationResult>
): DeleteOutcome => {
  if (result.kind !== 'success') return { kind: 'failed', id };
  const response = result.data.deleteLocation;
  if (response.__typename === 'DeleteResponse') return { kind: 'deleted', id };
  const error = response.error;
  if (error.__typename === 'LocationInUse') {
    return {
      kind: 'inUse',
      id,
      stockLines: error.stockLines.totalCount,
      invoiceLines: error.invoiceLines.totalCount,
    };
  }
  // Unreachable per the generated union today; kept so an unexpected member
  // degrades to "failed" rather than a crash.
  return { kind: 'failed', id };
};

export type DeleteSummary = {
  deletedCount: number;
  /** The in-use report rows (OMS-REG-INV-01.32/OMS-REG-INV-01.33) — blocked, with their references. */
  inUse: Extract<DeleteOutcome, { kind: 'inUse' }>[];
  /** Untyped failures (OMS-REG-INV-01.35) — reported by count only. */
  failedCount: number;
};

/**
 * OMS-REG-INV-01.33 — fold per-location outcomes: every unused location is deleted and
 * every blocked one reported, without one preventing the others (deletion is
 * not all-or-nothing).
 */
export const summariseOutcomes = (
  outcomes: DeleteOutcome[]
): DeleteSummary => ({
  deletedCount: outcomes.filter(o => o.kind === 'deleted').length,
  inUse: outcomes.filter(o => o.kind === 'inUse'),
  failedCount: outcomes.filter(o => o.kind === 'failed').length,
});
