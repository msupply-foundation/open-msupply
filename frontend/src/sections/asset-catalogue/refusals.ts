import {
  describeErrors,
  isForbidden,
  missingPermissions,
  type GraphqlErrorItem,
  type GraphqlResult,
} from '@/api/graphql';
import { rejectionFrom } from '@/api/rejection';
import { mapInBatches } from './batches';

// The writes here refuse through TOP-LEVEL GraphQL errors, not the unions their
// schema declares (spec/asset-catalogue › contract § deleting catalogue items,
// § log reasons): the item delete answers `AssetCatalogueItemInUse` /
// `AssetCatalogueItemDoesNotExist`, the reason writes `ReasonDoesNotExist` /
// `AssetLogReasonAlreadyExists`, and the `centralServer` wrapper
// `Not a central server` — each in `extensions.details`. So the writes are sent
// with `returnGraphqlErrors` and read here, where a refusal becomes the reason
// shown beside the refused record.

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
 *  refusal of one leaves the others (rules § deleting catalogue items). */
export interface DeleteSummary<R> {
  deleted: R[];
  refused: { record: R; reason: string }[];
  /** Permissions a Forbidden named, if any write was refused as one. */
  forbidden?: string[];
  /** Some write failed unexpectedly (already reported globally). */
  failed: boolean;
}

export const deleteEach = async <R>(
  records: readonly R[],
  deleteOne: (record: R) => Promise<WriteOutcome>
): Promise<DeleteSummary<R>> => {
  // A batch at a time, as the import sends its rows.
  const outcomes = await mapInBatches(records, deleteOne);
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
