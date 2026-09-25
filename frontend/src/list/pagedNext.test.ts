import { describe, expect, it, vi } from 'vitest';
import { hasFurtherPage, pagedNext, rowAfter } from './pagedNext';

type Row = { id: string; item: string };
const row = (id: string, item = id): Row => ({ id, item });

describe('rowAfter', () => {
  const rows = [row('a'), row('b'), row('c')];

  it('returns the row after the current one, and nothing when it is last', () => {
    expect(rowAfter(rows, false, r => r.id, 'a')?.id).toBe('b');
    expect(rowAfter(rows, false, r => r.id, 'c')).toBeUndefined();
  });

  it('scans a later page from its top', () => {
    expect(rowAfter(rows, true, r => r.id, 'z')?.id).toBe('a');
  });

  it('skips repeats of a covered key across a page', () => {
    const batches = [
      row('1', 'x'),
      row('2', 'y'),
      row('3', 'x'),
      row('4', 'z'),
    ];
    const covered = new Set(['y', 'x']);
    expect(rowAfter(batches, false, r => r.item, 'y', covered)?.item).toBe('z');
  });
});

describe('pagedNext', () => {
  const pages: Row[][] = [
    [row('a'), row('b')],
    [row('c'), row('d')],
    [row('e')],
  ];
  const walker = (offset: number, pick = (r: Row) => r) => {
    const setOffset = vi.fn();
    const fetchPage = vi.fn(
      async (at: number): Promise<Row[] | undefined> => pages[at / 2]
    );
    const run = (current: string) =>
      pagedNext<Row, Row>({
        rows: () => pages[offset / 2]!,
        page: () => ({ offset, first: 2 }),
        totalCount: () => 5,
        setOffset,
        fetchPage,
        pick: (pageRows, fromStart) =>
          rowAfter(pageRows, fromStart, r => r.id, current),
      }).then(found => found && pick(found));
    return { run, setOffset, fetchPage };
  };

  it('finds the next row on the current page without fetching', async () => {
    const { run, fetchPage, setOffset } = walker(0);
    expect((await run('a'))?.id).toBe('b');
    expect(fetchPage).not.toHaveBeenCalled();
    expect(setOffset).not.toHaveBeenCalled();
  });

  it('turns the page and moves the table when the current row is last', async () => {
    const { run, fetchPage, setOffset } = walker(0);
    expect((await run('b'))?.id).toBe('c');
    expect(fetchPage).toHaveBeenCalledWith(2, 2);
    expect(setOffset).toHaveBeenCalledWith(2);
  });

  it('runs out at the end of the last page', async () => {
    const { run, setOffset } = walker(4);
    expect(await run('e')).toBeUndefined();
    expect(setOffset).not.toHaveBeenCalled();
  });

  it('gives up when a page cannot be read', async () => {
    const { run, fetchPage } = walker(0);
    fetchPage.mockResolvedValueOnce(undefined);
    expect(await run('b')).toBeUndefined();
  });
});

describe('hasFurtherPage', () => {
  it('is true only while a page follows', () => {
    expect(hasFurtherPage({ offset: 0, first: 20 }, 21)).toBe(true);
    expect(hasFurtherPage({ offset: 20, first: 20 }, 21)).toBe(false);
  });
});
