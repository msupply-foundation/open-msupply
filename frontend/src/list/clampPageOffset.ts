/**
 * Keep a paged view's offset on a page that still exists.
 *
 * Pagination offset is VIEW state (URL-backed in most views, a signal in the
 * rest), so nothing about a refetch moves it — but a mutation can shrink the
 * row total underneath it:
 *
 * - Finalising a stocktake trims every uncounted line server-side (the OMS
 *   update service's `unallocated_lines_to_trim`), so a 93-line full stocktake
 *   with one counted line becomes a one-line one (issue #1117).
 * - A bulk delete of the last page's rows removes them outright, in every list
 *   and every detail line table that offers one.
 *
 * Paged past the new end, the refetched page comes back EMPTY and the table
 * shows its "nothing here" placeholder — which in most verticals reads as "this
 * record has no lines", the opposite of the truth. The pager stays up
 * (`paginationState` keeps the bar while `offset !== 0`), so Previous can
 * recover it, but nothing marks the page as one that no longer exists; #1117's
 * reporter reopened the record instead, which is what re-seeds offset 0.
 *
 * So: when a RESOLVED total proves the offset overshot, clamp to the last page
 * that still holds rows — not to page 1, so a small delete deep in a long list
 * doesn't throw the user back to the top.
 *
 * `total: undefined` means "not loaded yet", and is left alone deliberately: a
 * deep link (or a reload) restores `offset: 50` before its first page lands,
 * and a total coerced to 0 at that moment would clamp the link back to page 1.
 * Pass the resource's raw `latest?.totalCount`, NOT a `?? 0` accessor.
 */

import { createEffect } from 'solid-js';
import type { Accessor, Resource } from 'solid-js';

/** The offset of the last page that still holds rows (0 when none do). */
export const lastPageOffset = (total: number, pageSize: number): number =>
  total <= 0 ? 0 : Math.floor((total - 1) / pageSize) * pageSize;

/**
 * The offset this view should move to, or `undefined` to leave it alone —
 * the whole rule, as a pure function so it unit-tests without a reactive graph
 * (the same split as `paginationState`).
 */
export const clampedOffset = (
  total: number | undefined,
  offset: number,
  pageSize: number
): number | undefined => {
  // Not loaded yet (see above), already on the first page, or still in range.
  if (total === undefined || offset === 0 || offset < total) return undefined;
  return lastPageOffset(total, pageSize);
};

/**
 * A paged resource's row total, but ONLY once the fetch in flight has settled —
 * `undefined` until then, which is exactly what the guard treats as "unknown".
 *
 * `latest` deliberately survives a source change (that is what keeps rows on
 * screen across a refetch), so mid-fetch it can still hold the total of the
 * PREVIOUS query — another record's line count after a back-nav between two
 * paged detail URLs. Clamping against that would move a page the user asked for
 * on evidence about a different query. The `ready` gate means the total always
 * belongs to the offset it is being compared with.
 */
export const settledTotal = <T>(
  // The two fields of a resource this needs, rather than Resource<T> itself —
  // a real resource satisfies it, and the rule unit-tests without building a
  // reactive graph (the same split as paginationState).
  resource: { state: Resource<T>['state']; latest: T | undefined },
  select: (value: NonNullable<T>) => number
): number | undefined =>
  resource.state === 'ready' && resource.latest != null
    ? select(resource.latest)
    : undefined;

/**
 * Install the guard on a paged view. Call it once in the component body,
 * wherever the view's page state and its row total are both in scope — the
 * accessors keep it independent of HOW each view holds that state (a URL query,
 * a list-state module, plain signals).
 *
 * An effect rather than a derivation, because there is nothing to derive: the
 * view's own offset is what's wrong, and correcting it has to re-drive the
 * query (kdd/solid-reactivity-pitfalls §7 is about effects that stand in for a
 * memo — this one writes state the user owns). Idempotent: the clamped offset
 * satisfies the guard, so it settles in one step and never loops.
 */
export const clampPageOffset = (extent: {
  /** Resolved total — `undefined` while a fetch is in flight (settledTotal). */
  total: Accessor<number | undefined>;
  offset: Accessor<number>;
  pageSize: Accessor<number>;
  setOffset: (offset: number) => void;
}): void => {
  createEffect(() => {
    const offset = clampedOffset(
      extent.total(),
      extent.offset(),
      extent.pageSize()
    );
    if (offset !== undefined) extent.setOffset(offset);
  });
};
