import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'solid-js';
import { createPaginatedSearch, type Page } from './createPaginatedSearch';

// The pending contract (#318): `pending()` is true whenever `items()` doesn't
// answer the CURRENT search text — through the debounce window, while the
// page-0 fetch is in flight, and across a discarded stale response — and flips
// false only when a page-0 response for that text is applied. Consumers
// (AsyncCombobox) rely on it to client-filter the held rows so a fast
// type-and-Enter can't commit an option from the previous query.
//
// Fake timers drive the debounce; each fetch resolves via a manually-controlled
// deferred so responses can land out of order (the stale-response race).

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
};

const page = (...names: string[]): Page<string> => ({
  nodes: names,
  totalCount: names.length,
});

// A fetchPage stub that parks every call as a deferred, keyed by arrival
// order, so tests choose when (and in what order) responses land.
const createFetcher = () => {
  const calls: {
    search: string;
    offset: number;
    d: Deferred<Page<string> | undefined>;
  }[] = [];
  const fetchPage = (search: string, offset: number) => {
    const d = deferred<Page<string> | undefined>();
    calls.push({ search, offset, d });
    return d.promise;
  };
  return { calls, fetchPage };
};

// Resolve a parked call and wait for fetchAt's continuation (registered before
// this await, so it has completed by the time the await resumes).
const respond = async (
  call: { d: Deferred<Page<string> | undefined> },
  value: Page<string> | undefined
) => {
  call.d.resolve(value);
  await call.d.promise;
};

describe('createPaginatedSearch pending semantics', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is pending until the eager first page applies', async () => {
    const { calls, fetchPage } = createFetcher();
    await createRoot(async dispose => {
      const search = createPaginatedSearch<string>({ fetchPage });
      // The eager page-0 fetch is in flight — nothing answered yet.
      expect(search.pending()).toBe(true);
      expect(search.loading()).toBe(true);
      await respond(calls[0], page('alpha', 'beta'));
      expect(search.items()).toEqual(['alpha', 'beta']);
      expect(search.pending()).toBe(false);
      expect(search.loading()).toBe(false);
      dispose();
    });
  });

  it('goes pending on setSearch through the debounce window and the in-flight fetch, and settles when the response applies', async () => {
    const { calls, fetchPage } = createFetcher();
    await createRoot(async dispose => {
      const search = createPaginatedSearch<string>({ fetchPage });
      await respond(calls[0], page('alpha'));
      expect(search.pending()).toBe(false);

      // Keystroke: pending immediately, though the debounced fetch hasn't
      // fired yet (loading stays false — nothing is in flight).
      search.setSearch('amo');
      expect(search.pending()).toBe(true);
      expect(search.loading()).toBe(false);
      expect(calls).toHaveLength(1);

      // Debounce settles → the fetch fires; still pending, now loading.
      vi.advanceTimersByTime(300);
      expect(calls).toHaveLength(2);
      expect(calls[1].search).toBe('amo');
      expect(search.pending()).toBe(true);
      expect(search.loading()).toBe(true);
      // The held items are still the previous query's until the response.
      expect(search.items()).toEqual(['alpha']);

      await respond(calls[1], page('amoxicillin'));
      expect(search.items()).toEqual(['amoxicillin']);
      expect(search.pending()).toBe(false);
      dispose();
    });
  });

  it('a discarded stale response neither settles pending nor clobbers items', async () => {
    const { calls, fetchPage } = createFetcher();
    await createRoot(async dispose => {
      const search = createPaginatedSearch<string>({ fetchPage });
      await respond(calls[0], page('alpha'));

      // Two searches; both fetches in flight, the first now stale.
      search.setSearch('a');
      vi.advanceTimersByTime(300);
      search.setSearch('ab');
      vi.advanceTimersByTime(300);
      expect(calls).toHaveLength(3);

      // The stale 'a' response lands late: dropped by the request-id guard —
      // items untouched, and its text must NOT read as settled.
      await respond(calls[1], page('apple'));
      expect(search.items()).toEqual(['alpha']);
      expect(search.pending()).toBe(true);

      // The latest 'ab' response applies and settles.
      await respond(calls[2], page('abacavir'));
      expect(search.items()).toEqual(['abacavir']);
      expect(search.pending()).toBe(false);
      dispose();
    });
  });

  it('a failed page-0 fetch (undefined) still settles: empty items, not pending', async () => {
    const { calls, fetchPage } = createFetcher();
    await createRoot(async dispose => {
      const search = createPaginatedSearch<string>({ fetchPage });
      await respond(calls[0], page('alpha'));

      search.setSearch('zz');
      vi.advanceTimersByTime(300);
      // The server answered (with a failure the fetcher already surfaced) —
      // holding pending would suppress "no matches" forever.
      await respond(calls[1], undefined);
      expect(search.items()).toEqual([]);
      expect(search.pending()).toBe(false);
      dispose();
    });
  });

  it('loadMore (a next page for the settled search) never flips pending', async () => {
    const { calls, fetchPage } = createFetcher();
    await createRoot(async dispose => {
      const search = createPaginatedSearch<string>({ fetchPage });
      await respond(calls[0], { nodes: ['alpha'], totalCount: 3 });
      expect(search.hasMore()).toBe(true);

      search.loadMore();
      expect(calls).toHaveLength(2);
      expect(calls[1].offset).toBe(1);
      // Appending to the settled list: the held items still answer the
      // current text, so consumers must not blank or re-filter them.
      expect(search.pending()).toBe(false);
      expect(search.loadingMore()).toBe(true);

      await respond(calls[1], { nodes: ['beta'], totalCount: 3 });
      expect(search.items()).toEqual(['alpha', 'beta']);
      expect(search.pending()).toBe(false);
      dispose();
    });
  });

  it('deferred (eager: false): pending until ensure() fires and its page applies', async () => {
    const { calls, fetchPage } = createFetcher();
    await createRoot(async dispose => {
      const search = createPaginatedSearch<string>({
        fetchPage,
        eager: false,
      });
      // Nothing fetched, nothing answered — items don't answer '' yet.
      expect(calls).toHaveLength(0);
      expect(search.pending()).toBe(true);
      expect(search.loading()).toBe(false);

      search.ensure();
      expect(calls).toHaveLength(1);
      await respond(calls[0], page('alpha'));
      expect(search.pending()).toBe(false);
      dispose();
    });
  });
});
