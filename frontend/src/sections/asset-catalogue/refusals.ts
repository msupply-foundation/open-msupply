import { t } from '@/intl';
import {
  describeErrors,
  isForbidden,
  missingPermissions,
  type GraphqlErrorItem,
  type GraphqlResult,
} from '@/api/graphql';

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

const details = (errors: GraphqlErrorItem[]): string[] =>
  errors.map(e => String(e.extensions?.details ?? ''));

/** The user-facing reason for a refusal's details, or the server's own text. */
export const refusalReason = (errors: GraphqlErrorItem[]): string => {
  const all = details(errors);
  if (all.some(d => d.includes('AssetCatalogueItemInUse')))
    return t('error.asset-catalogue-item-in-use');
  if (
    all.some(
      d =>
        d.includes('AssetCatalogueItemDoesNotExist') ||
        d.includes('ReasonDoesNotExist')
    )
  )
    return t('messages.record-not-found');
  if (all.some(d => d.includes('Not a central server')))
    return t('auth.not-a-central-server');
  return describeErrors(errors);
};

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
  const outcomes = await Promise.all(records.map(deleteOne));
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
