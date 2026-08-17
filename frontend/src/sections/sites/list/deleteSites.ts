import type { GraphqlResult } from '@/api/graphql';
import type { DeleteSiteResult } from './sites.generated';

// Pure logic behind the delete flow (spec/sites/rules.md § deletion). There is
// no batch operation for sites, so a multi-select delete is N independent
// `deleteSite` calls and is **per-site, not atomic** (OMS-FUN-SYC-002.40): the
// deletable ones go and the refused ones are reported together, each by site
// name with its reason. Two of the four rejections are typed;
// `SiteDoesNotExist` and `NotStandaloneCentral` arrive as untyped top-level
// errors (contract.md ⚠️ wire trap), which is why the calls take their GraphQL
// errors back instead of letting one refusal trip the global unexpected-error
// modal mid-bulk. t()-free so node vitest covers it (spec/IMPLEMENTING.md C1).

/** Why a site was refused — each mapping to its own message in the report. */
export type RefusalReason =
  /** OMS-FUN-SYC-002.37 — every store must be moved off the site first. */
  | 'hasStores'
  /** OMS-FUN-SYC-002.39 — the register's root, and the reassignment target. */
  | 'centralSite'
  /** Untyped: the site does not exist, or the standalone-central check. */
  | 'other';

export type DeleteOutcome =
  | { kind: 'deleted'; id: number }
  | { kind: 'refused'; id: number; reason: RefusalReason };

/** Map one `deleteSite` call's result to its outcome. */
export const deleteOutcome = (
  id: number,
  result: GraphqlResult<DeleteSiteResult>
): DeleteOutcome => {
  // A non-success is an untyped refusal (Bad user input with the service
  // variant in extensions.details) or a transport failure — either way the site
  // remains.
  if (result.kind !== 'success')
    return { kind: 'refused', id, reason: 'other' };
  const response = result.data.centralServer.site.deleteSite;
  if (response.__typename === 'DeleteSiteNode') return { kind: 'deleted', id };
  switch (response.error.__typename) {
    case 'SiteHasStores':
      return { kind: 'refused', id, reason: 'hasStores' };
    case 'CannotDeleteCentralSite':
      return { kind: 'refused', id, reason: 'centralSite' };
  }
};

export type DeleteSummary = {
  deletedCount: number;
  /** The refusals, in selection order — one report line each, by site name. */
  refused: Extract<DeleteOutcome, { kind: 'refused' }>[];
};

/**
 * OMS-FUN-SYC-002.40 — fold the per-site outcomes: every deletable site in the
 * selection is removed and every refusal reported, without one preventing the
 * others.
 */
export const summariseOutcomes = (
  outcomes: readonly DeleteOutcome[]
): DeleteSummary => ({
  deletedCount: outcomes.filter(outcome => outcome.kind === 'deleted').length,
  refused: outcomes.filter(
    (outcome): outcome is Extract<DeleteOutcome, { kind: 'refused' }> =>
      outcome.kind === 'refused'
  ),
});

/** Did every selected site go? A wholly successful delete needs no report. */
export const allDeleted = (summary: DeleteSummary): boolean =>
  summary.refused.length === 0;
