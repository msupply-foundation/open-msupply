import { tPlural } from '../../../intl';
import type { SelectionActionResult } from '../../../domain/selection';
import type { BatchStocktakeLinesOutcome } from '../stocktakeLineUpdate';

// Map a batch outcome to the shape the SelectionActionModal drives on, shared by the three line
// selection actions (Delete / Change-location / Reduce-to-0) — they differ only in the input they
// build and what they apply on success, not in how success/partial/failure become a result. The
// error message is GENERIC (a count of failed lines, not per-typename): the action modal shows one
// Alert + a "Show error lines" jump, and the specific per-line errors are rendered on the rows via
// the detail view's line-error map. A transport failure (undefined outcome) is already surfaced by
// the global modal, so it resolves to a plain `ok` (the modal just closes).
export const lineSelectionActionResult = (
  outcome: BatchStocktakeLinesOutcome | undefined,
): SelectionActionResult => {
  if (!outcome || outcome.errors.size === 0) return { kind: 'ok' };
  const lineIds = [...outcome.errors.keys()];
  return {
    kind: 'error',
    message: tPlural('stocktake.errors.summary', lineIds.length),
    lineIds,
  };
};
