import { tPlural } from '../../../intl';
import type { ActionResult } from '../../../domain/action';
import type { BatchStocktakeLinesOutcome } from '../stocktakeLineUpdate';

// Map a batch outcome to the ActionResult an ActionModal drives on, shared by the line actions
// (Delete / Change-location / Reduce-to-0) — they differ only in the input they build and what they
// apply on success, not in how success/error become a result. The error message is GENERIC (a count
// of failed lines, not per-typename): the modal shows one Alert + a "Show error lines" jump, and the
// specific per-line errors are rendered on the rows via the detail view's line-error map. A
// transport failure (undefined outcome) is already surfaced by the global modal, so it resolves to a
// plain `ok` (the modal just closes).
export const lineActionResult = (
  outcome: BatchStocktakeLinesOutcome | undefined,
): ActionResult => {
  if (!outcome || outcome.errors.size === 0) return { kind: 'ok' };
  const lineIds = [...outcome.errors.keys()];
  return {
    kind: 'error',
    message: tPlural('stocktake.errors.summary', lineIds.length),
    lineIds,
  };
};
