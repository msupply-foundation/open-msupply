/**
 * "Save & next" over a server-paginated table: the next thing after the
 * current one in the table's current sort and filter, paging forward where
 * this page is exhausted. The current page is scanned first, after the current
 * row; later pages are fetched directly (race-free) from their top, and the
 * visible table follows each page turned, staying on the last page walked when
 * the list runs out.
 */

export type PagedNextOptions<Row, Found> = {
  /** The page the table currently shows. */
  rows: () => readonly Row[];
  page: () => { offset: number; first: number };
  totalCount: () => number;
  /** Move the visible table to this offset. */
  setOffset: (offset: number) => void;
  /** Read one further page, with the table's own sort and filter. */
  fetchPage: (
    offset: number,
    first: number
  ) => Promise<readonly Row[] | undefined>;
  /**
   * What to step to within a page's rows, or nothing. `fromStart` is false on
   * the current page — the scan must begin after the current row — and true
   * on every later page.
   */
  pick: (pageRows: readonly Row[], fromStart: boolean) => Found | undefined;
};

export const pagedNext = async <Row, Found>(
  options: PagedNextOptions<Row, Found>
): Promise<Found | undefined> => {
  const onThisPage = options.pick(options.rows(), false);
  if (onThisPage) return onThisPage;
  const { first } = options.page();
  let { offset } = options.page();
  for (;;) {
    offset += first;
    if (offset >= options.totalCount()) return undefined;
    options.setOffset(offset);
    const pageRows = await options.fetchPage(offset, first);
    if (!pageRows) return undefined;
    const found = options.pick(pageRows, true);
    if (found) return found;
  }
};

/**
 * The usual `pick`: the first row past the current one whose key is not yet
 * covered. Where one key spans several rows (an item over its batches), the
 * covered set — which includes the current key — skips its repeats.
 */
export const rowAfter = <Row>(
  pageRows: readonly Row[],
  fromStart: boolean,
  key: (row: Row) => string,
  currentKey: string,
  covered: ReadonlySet<string> = new Set([currentKey])
): Row | undefined => {
  let past = fromStart;
  for (const row of pageRows) {
    const id = key(row);
    if (id === currentKey) {
      past = true;
      continue;
    }
    if (past && !covered.has(id)) return row;
  }
  return undefined;
};

/** Whether the table has a page after the one shown. */
export const hasFurtherPage = (
  page: { offset: number; first: number },
  totalCount: number
): boolean => page.offset + page.first < totalCount;
