import { batch, createSignal, onCleanup } from 'solid-js';
import { createDebounced } from './createDebounced';

// One page of results from the server: the rows plus the grand total (so we
// know when there are no more pages to fetch).
export interface Page<T> {
  nodes: T[];
  totalCount: number;
}

export interface PaginatedSearchOptions<T> {
  /**
   * Fetch one page. Called with the current search text and the offset into the
   * full (server-filtered) result set (the offset is the number of rows already
   * accumulated). The fetcher owns its own page size. Returns the page, or
   * `undefined` on a failed fetch (graphqlFetch already surfaced the error) —
   * treated as "no rows, stop paging" so the list doesn't spin forever.
   */
  fetchPage: (search: string, offset: number) => Promise<Page<T> | undefined>;
  /** Debounce for the search input, in ms. Defaults to 300. */
  debounceMs?: number;
  /**
   * Fetch the first (empty-search) page immediately on creation — the default,
   * right for pickers that mount when they're about to be used (a modal's item
   * search). Pass `false` to defer that fetch to the first `ensure()` call —
   * for pickers that mount with the page (a detail toolbar's customer lookup),
   * so one the user never opens never fetches.
   */
  eager?: boolean;
}

export interface PaginatedSearch<T> {
  /** The accumulated rows across all pages fetched for the current search. */
  items: () => T[];
  /** A first-page fetch is in flight (the whole list is (re)loading). */
  loading: () => boolean;
  /** A subsequent page is in flight (append a spinner row, don't blank the list). */
  loadingMore: () => boolean;
  /** More pages exist for the current search (accumulated < totalCount). */
  hasMore: () => boolean;
  /** Set the search text — debounced; resets to page 0 once it settles. */
  setSearch: (value: string) => void;
  /** Fetch the next page (call when the list scrolls near the bottom). No-op
   * while a fetch is in flight or when there are no more pages. */
  loadMore: () => void;
  /** Arm the deferred (`eager: false`) first fetch — call on first open/focus.
   * No-op once any fetch has run, so firing per open is safe. */
  ensure: () => void;
}

/**
 * Drives a server-side-filtered, offset-paginated search that accumulates pages
 * for infinite scroll. The reusable half of a server-fed selector: it owns the
 * fetch/accumulate/paging state; the component (AsyncCombobox) owns the input +
 * listbox + scroll sentinel and just calls setSearch/loadMore/ensure and reads
 * items/loading.
 *
 * Entity-agnostic — fetchPage is the only coupling. Lives in the shared UI
 * layer (alongside AsyncCombobox) so a ui/ component can build on it without
 * importing from src/domain.
 *
 * Concurrency: each fetch is tagged with a monotonically increasing request id;
 * a resolved page is applied only if it's still the latest request, so a slow
 * page-0 response for an old search can't clobber a newer search's results
 * (the classic autocomplete race). Reads happen under a reactive owner
 * (a component), so the debounce timer auto-cancels on cleanup.
 */
export const createPaginatedSearch = <T>(
  options: PaginatedSearchOptions<T>
): PaginatedSearch<T> => {
  const [search, setSearchSignal] = createSignal('');
  const [items, setItems] = createSignal<T[]>([]);
  const [totalCount, setTotalCount] = createSignal(0);
  const [loading, setLoading] = createSignal(false);
  const [loadingMore, setLoadingMore] = createSignal(false);

  // The latest request wins: bump on every fetch, drop any response whose tag
  // is stale by the time it resolves.
  let requestId = 0;
  // Guard loadMore against firing while a fetch is already running.
  let fetching = false;
  // Whether any fetch has run — gates `ensure()` (the deferred first fetch) so
  // it can't duplicate a page 0 that typing already triggered.
  let armed = false;

  const hasMore = () => items().length < totalCount();

  // Fetch a page. offset 0 = a fresh search (replace + show the full-list
  // spinner); offset > 0 = append the next page (show the more spinner).
  const fetchAt = async (value: string, offset: number) => {
    const id = ++requestId;
    armed = true;
    fetching = true;
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);

    const page = await options.fetchPage(value, offset);

    // A newer search/loadMore started while we awaited — discard this response.
    if (id !== requestId) return;

    batch(() => {
      if (offset === 0) {
        setItems(page?.nodes ?? []);
      } else if (page) {
        setItems(prev => [...prev, ...page.nodes]);
      }
      if (page) setTotalCount(page.totalCount);
      setLoading(false);
      setLoadingMore(false);
    });
    fetching = false;
  };

  // Search text settles → reset to page 0. Debounced so we fire one request per
  // burst of keystrokes with the latest text (createDebounced buffers args).
  const runSearch = createDebounced((value: string) => {
    void fetchAt(value, 0);
  }, options.debounceMs ?? 300);

  const setSearch = (value: string) => {
    setSearchSignal(value);
    runSearch(value);
  };

  const loadMore = () => {
    if (fetching || !hasMore()) return;
    void fetchAt(search(), items().length);
  };

  // Eager (default): kick off the initial (empty-search) page so the list has
  // content the moment it opens, before the user types. Deferred: the first
  // page waits for `ensure()` (first open/focus).
  if (options.eager ?? true) void fetchAt('', 0);

  const ensure = () => {
    if (!armed) void fetchAt('', 0);
  };

  // Drop any in-flight response on teardown by advancing the id past what any
  // pending fetch captured (the debounce timer is auto-cancelled by
  // createDebounced under the owner).
  onCleanup(() => {
    requestId++;
  });

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    setSearch,
    loadMore,
    ensure,
  };
};
