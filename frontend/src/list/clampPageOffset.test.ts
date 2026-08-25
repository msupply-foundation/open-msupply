import { describe, expect, it } from 'vitest';
import { clampedOffset, lastPageOffset, settledTotal } from './clampPageOffset';

// The stale-offset guard (issue #1117: a stocktake's counted lines invisible
// after finalising from page 2, because finalise trims every uncounted line
// server-side and the view stayed paged past the new end). Every paged view
// installs it via clampPageOffset; the rule itself is pure, and pinned here —
// the same split as paginationState, whose own test explains why that matters.
describe('lastPageOffset', () => {
  it('is the start of the page holding the last row', () => {
    expect(lastPageOffset(93, 50)).toBe(50);
    expect(lastPageOffset(51, 50)).toBe(50);
    // A full page exactly: the last row is the 50th, still page 1.
    expect(lastPageOffset(50, 50)).toBe(0);
    expect(lastPageOffset(1, 50)).toBe(0);
  });

  it('is 0 when nothing is left', () => {
    expect(lastPageOffset(0, 50)).toBe(0);
    // Defensive: a negative total is nonsense, but must not produce a
    // negative offset the query would then send to the server.
    expect(lastPageOffset(-1, 50)).toBe(0);
  });

  it('follows the chosen page size', () => {
    expect(lastPageOffset(93, 20)).toBe(80);
    expect(lastPageOffset(93, 100)).toBe(0);
  });
});

describe('clampedOffset', () => {
  it('leaves an in-range offset alone', () => {
    // Page 2 of 93 rows — where #1117's reporter was standing.
    expect(clampedOffset(93, 50, 50)).toBeUndefined();
    expect(clampedOffset(51, 50, 50)).toBeUndefined();
  });

  it('leaves the first page alone, at any total', () => {
    expect(clampedOffset(0, 0, 50)).toBeUndefined();
    expect(clampedOffset(93, 0, 50)).toBeUndefined();
  });

  it('clamps once the total shrinks past the offset', () => {
    // #1117 exactly: finalise trimmed 93 lines to the 1 counted line.
    expect(clampedOffset(1, 50, 50)).toBe(0);
    // A bulk delete of the last page's rows: 51 → 50 leaves page 2 empty.
    expect(clampedOffset(50, 50, 50)).toBe(0);
    // Deleting every line: nowhere to go but the first page.
    expect(clampedOffset(0, 50, 50)).toBe(0);
  });

  it('clamps to the nearest surviving page, not to page 1', () => {
    // 120 rows, on page 3; a delete leaves 60 → page 2 is as close as it gets.
    expect(clampedOffset(60, 100, 50)).toBe(50);
    expect(clampedOffset(41, 60, 20)).toBe(40);
  });

  it('leaves the offset alone while the total is unknown', () => {
    // The first page of a deep link (?offset=50) has not landed yet — a total
    // coerced to 0 here would clamp the shared link back to page 1.
    expect(clampedOffset(undefined, 50, 50)).toBeUndefined();
  });

  it('reads a resource total only once it belongs to the current query', () => {
    type Page = { totalCount: number } | undefined;
    const held: Page = { totalCount: 40 };
    const count = (value: NonNullable<Page>) => value.totalCount;

    expect(settledTotal<Page>({ state: 'ready', latest: held }, count)).toBe(
      40
    );
    // Mid-fetch `latest` can still be the PREVIOUS query's page — a total that
    // must not be compared against the offset the user just asked for.
    expect(
      settledTotal<Page>({ state: 'refreshing', latest: held }, count)
    ).toBeUndefined();
    expect(
      settledTotal<Page>({ state: 'pending', latest: held }, count)
    ).toBeUndefined();
    // Nothing fetched yet.
    expect(
      settledTotal<Page>({ state: 'unresolved', latest: undefined }, count)
    ).toBeUndefined();
  });

  it('settles in one step', () => {
    const first = clampedOffset(1, 50, 50);
    expect(first).toBe(0);
    expect(clampedOffset(1, first!, 50)).toBeUndefined();
    const deep = clampedOffset(60, 100, 50);
    expect(deep).toBe(50);
    expect(clampedOffset(60, deep!, 50)).toBeUndefined();
  });
});
