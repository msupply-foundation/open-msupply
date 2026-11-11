import type { ColumnPinningState } from '@tanstack/solid-table';

// Content equality for the table state DataTable hands TanStack — column
// order, grouping, pinning, visibility and saved sizes (#1890). The page's
// resolved config is a NEW object on every write, and TanStack's memos compare
// their inputs by reference, so a fresh-but-equal array (a `?? []` fallback
// re-run) reads to it as a changed column order: it rebuilds every cell object
// and the table remounts every body cell. DataTable's config-derived memos use
// these as their `equals`, so they keep the old value while nothing in it
// changed. Split out so the rules are unit-tested — get one wrong and the
// remount quietly comes back.

/** Same items in the same order. `undefined` equals only `undefined`. */
export const sameList = (
  a: readonly string[] | undefined,
  b: readonly string[] | undefined
): boolean =>
  a === b ||
  (a !== undefined &&
    b !== undefined &&
    a.length === b.length &&
    a.every((v, i) => v === b[i]));

/**
 * Same keys with the same values, in any order. A key missing on one side
 * differs from that key set to `undefined` on the other.
 */
export const sameRecord = <V>(
  a: Record<string, V>,
  b: Record<string, V>
): boolean => {
  if (a === b) return true;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every(k => Object.hasOwn(b, k) && a[k] === b[k])
  );
};

/** Same columns pinned on each side, in the same order. */
export const samePinning = (
  a: ColumnPinningState,
  b: ColumnPinningState
): boolean => sameList(a.left, b.left) && sameList(a.right, b.right);
