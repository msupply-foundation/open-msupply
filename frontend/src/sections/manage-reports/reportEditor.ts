import type { GraphqlResult } from '@/api/graphql';
import type {
  UpdateReportResult,
  UpdateReportVariables,
} from './manageReports.generated';
import type { ReportVersion } from './reportRegister';

// Changing a version's active state and its report's store tags
// (spec/manage-reports rules.md § activation and § store tags, contract.md §
// activation and § store tags). Pure — the dialog owns only the signals.

/**
 * The editable draft.
 *
 * `UpdateReportInput` is `{ id, isActive, storeTagIds }`, so active state and
 * store tags are the only properties of an installed report that can change
 * (OMS-REG-MNG-06.35). Name, code, version, custom and context are fixed at
 * install and are shown read-only. Store tags belong to the report's code, so
 * saving them from this version sets them for every version
 * (OMS-REG-MNG-06.36).
 */
export type ReportEditDraft = {
  id: string;
  isActive: boolean;
  storeTagIds: string[];
};

export const draftFromVersion = (version: ReportVersion): ReportEditDraft => ({
  id: version.id,
  isActive: version.isActive,
  storeTagIds: [...version.storeTagIds],
});

/** Same tags in any order: the order they were picked in means nothing. */
const sameTags = (a: readonly string[], b: readonly string[]): boolean => {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every(id => right.has(id));
};

/**
 * Saving is unavailable until a value actually differs from the stored one
 * (OMS-REG-MNG-06.17, .37) — so reopening a version and closing it cannot
 * rewrite the row, and an unchanged dialog offers nothing to do.
 */
export const canSaveReport = (
  draft: ReportEditDraft,
  version: ReportVersion
): boolean =>
  draft.isActive !== version.isActive ||
  !sameTags(draft.storeTagIds, version.storeTagIds);

/**
 * The mutation's input — the draft is already exactly its shape. The tags
 * always travel: an unchanged list is a no-op on the server.
 */
export const reportUpdateInput = (
  draft: ReportEditDraft
): UpdateReportVariables['input'] => ({
  id: draft.id,
  isActive: draft.isActive,
  storeTagIds: draft.storeTagIds,
});

export type ReportSaveOutcome =
  | { kind: 'saved'; isActive: boolean }
  /**
   * Rejected, carrying the server's own description. The only domain rejection
   * this mutation has is an id that is not an installed version, but it is
   * UNTYPED — so the description is passed through rather than recognised, and
   * no client-side message is invented for it (error-handling parity).
   */
  | { kind: 'rejected'; serverError: string }
  /** Transport or an already-reported failure — the global modal owns it. */
  | { kind: 'failed' };

/**
 * Map the update mutation's result.
 *
 * There is no error union to match on: an unknown id arrives as a top-level
 * `Bad user input` whose extensions.details is "Report not found"
 * (contract.md § activation). A GraphQL-level error IS that rejection — the
 * caller opted to receive it precisely so it surfaces in the dialog rather
 * than the global modal.
 */
export const reportSaveOutcome = (
  result: GraphqlResult<UpdateReportResult>
): ReportSaveOutcome => {
  if (result.kind === 'success') {
    return {
      kind: 'saved',
      isActive: result.data.centralServer.reports.updateReport.isActive,
    };
  }
  if (result.kind === 'graphqlError') {
    const details = result.errors[0]?.extensions?.details;
    return {
      kind: 'rejected',
      serverError:
        typeof details === 'string' && details.length > 0
          ? details
          : (result.errors[0]?.message ?? 'UnknownError'),
    };
  }
  return { kind: 'failed' };
};
