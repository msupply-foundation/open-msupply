import { describe, expect, it, vi } from 'vitest';
import {
  createNextItemWalk,
  type WalkPage,
  type WalkRow,
} from './nextItemWalk';

// The Save & next walk (rules.md § Save & next and the next-item walk;
// AC-V7/V8): current-page hit, cross-page advance, covered-set skip across a
// page boundary, exhaustion, fetch failure, abort mid-walk, and the
// remembered-page behaviour that keeps the scan off the reactive (possibly
// stale) resource.

const row = (itemId: string): WalkRow => ({
  item: { id: itemId, code: `c-${itemId}`, name: `Item ${itemId}` },
});

// Three pages of two rows each; items a..f, one row per item except where a
// test overrides. Offsets: 0 → [a,b], 2 → [c,d], 4 → [e,f].
const pages = (byOffset: Record<number, string[]>, totalCount: number) => {
  const fetchPage = vi.fn(
    async (offset: number): Promise<WalkPage | undefined> => {
      const ids = byOffset[offset];
      return ids ? { rows: ids.map(row), totalCount } : undefined;
    }
  );
  return fetchPage;
};

const deps = (
  over: Partial<Parameters<typeof createNextItemWalk>[0]> = {}
) => ({
  fetchPage: pages({ 0: ['a', 'b'], 2: ['c', 'd'], 4: ['e', 'f'] }, 6),
  currentOffset: () => 0,
  pageSize: () => 2,
  advancePage: vi.fn(),
  aborted: () => false,
  ...over,
});

describe('createNextItemWalk', () => {
  it('finds the next distinct item after the current one on the current page', async () => {
    const walk = createNextItemWalk(deps());
    const next = await walk.next('a', new Set(['a']));
    expect(next?.id).toBe('b');
  });

  it('an item spanning several rows is offered once (covered set skips it)', async () => {
    const fetchPage = pages({ 0: ['a', 'b', 'b', 'c'] }, 4);
    const walk = createNextItemWalk(deps({ fetchPage, pageSize: () => 4 }));
    const next = await walk.next('b', new Set(['a', 'b']));
    expect(next?.id).toBe('c');
  });

  it('advances pages (advancePage fires per page) until an uncovered item appears', async () => {
    const advancePage = vi.fn();
    const walk = createNextItemWalk(deps({ advancePage }));
    // b is covered → nothing after a on page 0 → advance to offset 2.
    const next = await walk.next('a', new Set(['a', 'b']));
    expect(next?.id).toBe('c');
    expect(advancePage).toHaveBeenCalledTimes(1);
    expect(advancePage).toHaveBeenCalledWith(2);
  });

  it('walks across a fully-covered page boundary', async () => {
    const advancePage = vi.fn();
    const walk = createNextItemWalk(deps({ advancePage }));
    const next = await walk.next('a', new Set(['a', 'b', 'c', 'd']));
    expect(next?.id).toBe('e');
    expect(advancePage.mock.calls.map(call => call[0])).toEqual([2, 4]);
  });

  it('exhaustion returns undefined and stays on the last page', async () => {
    const advancePage = vi.fn();
    const walk = createNextItemWalk(deps({ advancePage }));
    const next = await walk.next('a', new Set(['a', 'b', 'c', 'd', 'e', 'f']));
    expect(next).toBeUndefined();
    // Advanced through both later pages, no advance past the end.
    expect(advancePage.mock.calls.map(call => call[0])).toEqual([2, 4]);
  });

  it('a failed fetch aborts the walk (undefined, no further paging)', async () => {
    const fetchPage = vi.fn(async (offset: number) =>
      offset === 0 ? { rows: [row('a'), row('b')], totalCount: 6 } : undefined
    );
    const advancePage = vi.fn();
    const walk = createNextItemWalk(deps({ fetchPage, advancePage }));
    const next = await walk.next('a', new Set(['a', 'b']));
    expect(next).toBeUndefined();
    expect(advancePage).toHaveBeenCalledTimes(1);
  });

  it('abort stops the walk before any further page advance', async () => {
    let aborted = false;
    const advancePage = vi.fn();
    const fetchPage = vi.fn(async (offset: number): Promise<WalkPage> => {
      // The editor closes while page 0's scan fetch is in flight.
      aborted = true;
      return { rows: offset === 0 ? [row('a')] : [row('c')], totalCount: 6 };
    });
    const walk = createNextItemWalk(
      deps({ fetchPage, advancePage, aborted: () => aborted })
    );
    const next = await walk.next('a', new Set(['a']));
    expect(next).toBeUndefined();
    expect(advancePage).not.toHaveBeenCalled();
  });

  it('scans its OWN last-fetched page, not a stale offset (remembered page)', async () => {
    // Simulate the walk having advanced to offset 2 previously: the table's
    // currentOffset now reports 2, and the walk remembered page 2's rows.
    const fetchPage = pages({ 0: ['a', 'b'], 2: ['c', 'd'], 4: ['e', 'f'] }, 6);
    const advancePage = vi.fn();
    let offset = 0;
    const walk = createNextItemWalk(
      deps({
        fetchPage,
        advancePage: (next: number) => {
          offset = next;
          advancePage(next);
        },
        currentOffset: () => offset,
      })
    );
    // First advance lands on c (page 2 fetched + remembered).
    expect((await walk.next('a', new Set(['a', 'b'])))?.id).toBe('c');
    fetchPage.mockClear();
    // Next call: current item c sits on the REMEMBERED page — d must be
    // found there with NO refetch of page 2 (and crucially no skip to 4).
    const next = await walk.next('c', new Set(['a', 'b', 'c']));
    expect(next?.id).toBe('d');
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('reset() drops the remembered page so the next call refetches', async () => {
    const fetchPage = pages({ 0: ['a', 'b'] }, 2);
    const walk = createNextItemWalk(deps({ fetchPage }));
    await walk.next('a', new Set(['a']));
    expect(fetchPage).toHaveBeenCalledTimes(1);
    walk.reset();
    await walk.next('a', new Set(['a']));
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});
