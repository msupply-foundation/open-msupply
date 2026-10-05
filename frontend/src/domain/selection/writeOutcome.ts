import {
  describeErrors,
  isForbidden,
  missingPermissions,
  type GraphqlErrorItem,
  type GraphqlResult,
} from '@/api/graphql';
import { rejectionFrom } from '@/api/rejection';
import { mapInBatches, WRITE_CONCURRENCY } from '@/api/batches';

// For writes that refuse through TOP-LEVEL GraphQL errors, not a response
// union: the asset-catalogue deletes and reason writes (spec/asset-catalogue ›
// contract § deleting catalogue items, § log reasons) and the plugin install,
// uninstall and settings writes (spec/plugin-management › contract), plus the
// `centralServer` wrapper's `Not a central server` — each in
// `extensions.details`. So the writes are sent with `returnGraphqlErrors` and
// read here, where a refusal becomes the reason shown beside the refused
// record.

/** What one write came back as. */
export type WriteOutcome =
  | { kind: 'done' }
  | { kind: 'refused'; reason: string }
  | { kind: 'forbidden'; permissions: string[] }
  // Transport / unexpected — the global modal has already said so.
  | { kind: 'failed' };

/** The user-facing reason for a refusal: the house `rejectionFrom`, which
 *  translates the bare variant name in `extensions.details` through
 *  `server-error.<Variant>`. The central-server wrapper's refusal is a plain
 *  sentence rather than a variant, so it is recovered as one by name. A dump
 *  it can't name shows the server's own text. */
export const refusalReason = (errors: GraphqlErrorItem[]): string =>
  rejectionFrom(errors, describeErrors(errors), detail =>
    detail.includes('Not a central server') ? 'NotACentralServer' : undefined
  ).message;

/** Classify a write's result. A Forbidden is kept apart so the caller routes
 *  it to the permission-denied modal, as every other Forbidden is. */
export const outcomeOf = <T>(result: GraphqlResult<T>): WriteOutcome => {
  switch (result.kind) {
    case 'success':
      return { kind: 'done' };
    case 'graphqlError':
      return isForbidden(result.errors)
        ? { kind: 'forbidden', permissions: missingPermissions(result.errors) }
        : { kind: 'refused', reason: refusalReason(result.errors) };
    case 'forbidden':
      return { kind: 'forbidden', permissions: [] };
    default:
      return { kind: 'failed' };
  }
};

/** A bulk delete's result: each selected record deleted ON ITS OWN, so a
 *  refusal of one leaves the others. */
export interface DeleteSummary<R> {
  deleted: R[];
  refused: { record: R; reason: string }[];
  /** Permissions a Forbidden named, if any write was refused as one. */
  forbidden?: string[];
  /** Some write failed unexpectedly (already reported globally). */
  failed: boolean;
}

/** Delete each record on its own, `batchSize` at a time (api/batches). Pass
 *  1 where two records can name the same server row, so their calls never
 *  overlap. */
export const deleteEach = async <R>(
  records: readonly R[],
  deleteOne: (record: R) => Promise<WriteOutcome>,
  batchSize = WRITE_CONCURRENCY
): Promise<DeleteSummary<R>> => {
  const outcomes = await mapInBatches(records, deleteOne, undefined, batchSize);
  const summary: DeleteSummary<R> = { deleted: [], refused: [], failed: false };
  outcomes.forEach((outcome, index) => {
    const record = records[index]!;
    switch (outcome.kind) {
      case 'done':
        summary.deleted.push(record);
        break;
      case 'refused':
        summary.refused.push({ record, reason: outcome.reason });
        break;
      case 'forbidden':
        summary.forbidden = outcome.permissions;
        break;
      case 'failed':
        summary.failed = true;
        break;
    }
  });
  return summary;
};
