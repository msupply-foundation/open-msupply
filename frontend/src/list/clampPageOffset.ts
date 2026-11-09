/**
 * Keep a paged view's offset on a page that still exists.
 *
 * The offset is view state, so a refetch never moves it — but a mutation can
 * shrink the total underneath it: finalising a stocktake trims every uncounted
 * line server-side (issue #1117), and a bulk delete takes out the last page's
 * rows. Paged past the new end, the table renders "nothing here", which reads
 * as "this record has no lines" — the opposite of the truth.
 */

import { createEffect } from 'solid-js';
import type { Accessor, Resource } from 'solid-js';

/** The offset of the last page that still holds rows (0 when none do). */
export const lastPageOffset = (total: number, pageSize: number): number =>
  total <= 0 ? 0 : Math.floor((total - 1) / pageSize) * pageSize;

/**
 * Where the view should move to, or `undefined` to leave it be. Pure, so the
 * rule unit-tests without a reactive graph (as `paginationState` does).
 *
 * An unknown total is left alone: a deep link to `?offset=50` restores that
 * offset before its first page lands, and a total of 0 at that moment would
 * clamp the link back to page 1.
 */
export const clampedOffset = (
  total: number | undefined,
  offset: number,
  pageSize: number
): number | undefined => {
  if (total === undefined || offset === 0 || offset < total) return undefined;
  return lastPageOffset(total, pageSize);
};

/**
 * A paged resource's total, once the fetch in flight has settled.
 *
 * `latest` survives a source change (that is what keeps rows on screen across a
 * refetch), so mid-fetch it can hold the PREVIOUS query's total — another
 * record's line count after a back-nav between two paged detail URLs. The
 * `ready` gate means the total belongs to the offset it is compared with.
 */
export const settledTotal = <T>(
  // Structural, not Resource<T>: a real resource satisfies it, and a test needs
  // no reactive graph.
  resource: { state: Resource<T>['state']; latest: T | undefined },
  select: (value: NonNullable<T>) => number
): number | undefined =>
  resource.state === 'ready' && resource.latest != null
    ? select(resource.latest)
    : undefined;

/**
 * Install the guard — once per paged view, in the component body. Accessors, so
 * it doesn't care how the view holds its page state (URL query, signals).
 *
 * An effect because there is nothing to derive: the view's own offset is what's
 * wrong, and correcting it re-drives the query. Idempotent — the clamped offset
 * satisfies the guard, so it settles in one step.
 */
export const clampPageOffset = (extent: {
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
