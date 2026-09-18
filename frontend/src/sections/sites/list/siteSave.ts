import type { SaveRejection } from './siteEdit';

// The save SEQUENCE (spec/sites/rules.md § saving a site). Two writes in one
// user gesture — the site's own fields first, then its store assignments — with
// no shared transaction, which is the whole reason this is its own module: the
// ordering and what survives a mid-sequence failure are behaviour
// (OMS-FUN-SYC-002.36), so they are expressed as a pure orchestrator over
// injected steps and tested directly, rather than buried in the modal's event
// handler.

/** One write. `undefined` = it succeeded. */
export type SaveStep = () => Promise<SaveRejection | undefined>;

/**
 * The two halves of a save. `stores` holds the assignment calls in order —
 * additions, then removals-as-reassignments — and is EMPTY when the store draft
 * is unchanged, so an untouched association is never rewritten by a name, code
 * or password edit (OMS-FUN-SYC-002.3).
 */
export type SavePlan = { site: SaveStep; stores: SaveStep[] };

/**
 * What a save came to.
 *
 * `storesRejected` is the case the two-write shape creates and the spec records
 * as-is: the site's field changes are **already committed** and stay that way;
 * the error is surfaced and the editor stays open (OMS-FUN-SYC-002.36,
 * rules.md § saving a site). Only `saved` closes the editor.
 */
export type SaveOutcome =
  | { kind: 'saved' }
  | { kind: 'siteRejected'; rejection: SaveRejection }
  | { kind: 'storesRejected'; rejection: SaveRejection };

export const runSiteSave = async (plan: SavePlan): Promise<SaveOutcome> => {
  // The site's own fields first. A rejection here has committed nothing, so the
  // store steps are never reached.
  const siteRejection = await plan.site();
  if (siteRejection) return { kind: 'siteRejected', rejection: siteRejection };
  // Then the assignments, in order, stopping at the first refusal — each is one
  // transaction of its own (all-or-nothing across the stores IT carries), but
  // the two are not a transaction together.
  for (const step of plan.stores) {
    const rejection = await step();
    if (rejection) return { kind: 'storesRejected', rejection };
  }
  return { kind: 'saved' };
};
