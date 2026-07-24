// The "Save & next" next-item walk (rules.md § Save & next and the next-item
// walk; AC-V7/V8), extracted from the view so the paging logic is testable
// and race-free:
//
// - Pages are always read from the walk's OWN direct fetches (never the
//   reactive lines resource, whose `.latest` may still hold a previous page
//   mid-refetch — scanning that could skip the rest of the real current
//   page). The first call fetches the current page; each advance fetches the
//   next and remembers it, so a following call scans the right rows.
// - The walk stops dead once `aborted()` reports the editor closed — a
//   cancel mid-walk must not keep paging the table underneath the user.
// - `advancePage` is the caller's "the visible table moves" hook (setQuery +
//   selection clear, AC-V9).
//
// The total count comes from each direct fetch (not a reactive accessor), so
// the loop bound is as fresh as the page it scans.

export type WalkRow = {
  item: {
    id: string;
    name: string;
    unitName?: string | null;
    isVaccine?: boolean;
    doses?: number;
  };
};

export type WalkItem = WalkRow['item'];

export type WalkPage = { rows: WalkRow[]; totalCount: number };

export interface NextItemWalkDeps {
  /** Direct, race-free page fetch; undefined = fetch failed (already surfaced). */
  fetchPage: (offset: number, first: number) => Promise<WalkPage | undefined>;
  /** The table's current offset / page size (URL state). */
  currentOffset: () => number;
  pageSize: () => number;
  /** Move the visible table to `offset` (setQuery + selection clear). */
  advancePage: (offset: number) => void;
  /** The editor closed — stop walking (no further advance/fetch/seed). */
  aborted: () => boolean;
}

export interface NextItemWalk {
  next: (
    currentId: string,
    covered: Set<string>
  ) => Promise<WalkItem | undefined>;
  /** Drop the remembered page (a save changed the rows; refetch on next call). */
  reset: () => void;
}

export const createNextItemWalk = (deps: NextItemWalkDeps): NextItemWalk => {
  // The page the walk last fetched, keyed by its offset. Never the reactive
  // resource: this is what the walk itself saw.
  let cached: { offset: number; page: WalkPage } | undefined;

  const fetchInto = async (
    offset: number,
    first: number
  ): Promise<WalkPage | undefined> => {
    const page = await deps.fetchPage(offset, first);
    cached = page ? { offset, page } : undefined;
    return page;
  };

  // Pick the next distinct, uncovered item within a page's rows. On the
  // current page we start AFTER the current item's rows (`fromStart` false —
  // items before it are already behind us); on later pages everything is
  // "after" (`fromStart` true). The covered set (which includes the current
  // item) skips repeats — an item spanning several batch rows, or one already
  // stepped through this run.
  const pick = (
    rows: readonly WalkRow[],
    currentId: string,
    covered: Set<string>,
    fromStart: boolean
  ): WalkItem | undefined => {
    let past = fromStart;
    for (const row of rows) {
      if (row.item.id === currentId) {
        past = true;
        continue;
      }
      if (!past || covered.has(row.item.id)) continue;
      return row.item;
    }
    return undefined;
  };

  const next = async (
    currentId: string,
    covered: Set<string>
  ): Promise<WalkItem | undefined> => {
    if (deps.aborted()) return undefined;
    const first = deps.pageSize();
    let offset = deps.currentOffset();

    // The current page, as the walk knows it: the remembered direct fetch
    // when it matches the table's offset, else a fresh direct fetch.
    const current =
      cached?.offset === offset ? cached.page : await fetchInto(offset, first);
    if (!current) return undefined;
    const onThisPage = pick(current.rows, currentId, covered, false);
    if (onThisPage) return onThisPage;

    let totalCount = current.totalCount;
    for (;;) {
      offset += first;
      if (offset >= totalCount) return undefined;
      if (deps.aborted()) return undefined;
      // Move the visible table to this page (the resource refetches it too).
      deps.advancePage(offset);
      const page = await fetchInto(offset, first);
      if (!page) return undefined;
      totalCount = page.totalCount;
      const found = pick(page.rows, currentId, covered, true);
      if (found) return found;
    }
  };

  return { next, reset: () => (cached = undefined) };
};
