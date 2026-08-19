import { createResource, createRoot } from 'solid-js';
import { gated } from './gated';

// A store-scoped, lazy, de-duplicated global cache — the reusable shape for
// app-wide lookups that depend on the current store (master lists, locations,
// …). Generalises the storeContext pattern (kdd/state-management:
// resource-signal global state).
//
// Built on `createResource` inside a lazy `createRoot` singleton, which gives
// us the three behaviours for free:
//   - Lazy: the resource (and its reactive owner) is created on FIRST use — a
//     screen that never reads the cache never creates or fetches it.
//   - Store-aware: the resource's source is `storeId`, so it refetches whenever
//     the current store changes. The key is the store id — no hand-rolled
//     comparison.
//   - De-duplicated: one shared instance (the singleton) + createResource's own
//     single-flight means N consumers (e.g. 30 table cells reading the same
//     cache) cause ONE request, not N. No debounce needed — dedup is exact and
//     immediate.
//
// `createRoot` gives the resource an owner so it disposes cleanly (and avoids
// Solid's "computation created outside a root" warning).
//
// Suspense safety (kdd/state-management: no remounts on interaction): the
// consumer chooses its read behaviour by NAME — `suspends()` vs `noSuspense()`
// — rather than there being one `data()` whose suspend behaviour you have to
// remember. The factory never exposes the raw resource, so those two named
// accessors are the only reads.
//
// Failures are handled globally (graphqlFetch trips the unexpected-error
// modal); the fetcher returns undefined on failure and the cache falls back to
// an empty list, so consumers keep showing their loading/empty state.

export type StoreScopedResource<T> = {
  /**
   * The list for the current store, read through the raw resource — so this
   * SUSPENDS an ancestor <Suspense> while the first load is pending (and
   * re-suspends if you read it during a refetch that has no prior value).
   * Reading it arms the lazy fetch. Use this only where a <Suspense> fallback
   * is exactly the UX you want; otherwise `noSuspense`.
   */
  suspends: () => T[];
  /**
   * The list for the current store, read WITHOUT ever suspending: `[]` until
   * the first load resolves, then the loaded list, and it keeps the previous
   * list during a refetch (no flash). This is the no-remount read
   * (kdd/state-management). NB: this is NOT `resource.latest` — `.latest` still
   * suspends on the first pending read; this gates on `resource.state` so it
   * never trips the boundary. Reading it arms the fetch.
   */
  noSuspense: () => T[];
  /** True while a fetch for the current store is in flight. */
  loading: () => boolean;
  /** Force a refetch now (e.g. after a mutation that changed the list).
   * Awaitable. NB: arms the lazy cache — refetching a never-read cache builds
   * it and fetches. From a screen that only WRITES the list (and may never
   * read it), use `invalidate` instead. */
  refetch: () => Promise<void>;
  /** Mark the cache stale after a mutation changed the list: refetches an
   * ARMED cache, and leaves a never-read one unbuilt — it simply loads fresh
   * on its first real read, so invalidating never costs an unwanted fetch.
   * Fire-and-forget. */
  invalidate: () => void;
};

export function createStoreScopedResource<T>(
  // The current store id (module-level reactive accessor, e.g. currentStoreId).
  storeId: () => string | undefined,
  // Fetches the list for a store; returns undefined on failure (handled
  // globally).
  fetcher: (storeId: string) => Promise<T[] | undefined>
): StoreScopedResource<T> {
  // Lazy singleton: one instance built on first use, shared by every consumer.
  let instance: StoreScopedResource<T> | undefined;

  const build = (): StoreScopedResource<T> =>
    createRoot(() => {
      const [resource, { refetch }] = createResource(
        storeId,
        async id => (await fetcher(id)) ?? []
      );
      return {
        // Idiomatic resource read — suspends an ancestor <Suspense> on the
        // first pending read. `?? []` only matters once resolved (the resource
        // always fetches to `T[]`); while pending, reading `resource()`
        // suspends before this runs.
        suspends: () => resource() ?? [],
        // No-suspend read: the shared `gated` gate (NOT `.latest`, which still
        // suspends on the first pending read — the exact remount bug, see the
        // type doc / kdd/state-management). 'refreshing' keeps the prior value
        // during a refetch; any other state falls back to []. Never trips the
        // boundary, first read or later.
        noSuspense: () => gated(resource) ?? [],
        loading: () => resource.loading,
        refetch: async () => {
          await refetch();
        },
        invalidate: () => {
          void refetch();
        },
      };
    });

  return {
    suspends: () => (instance ??= build()).suspends(),
    noSuspense: () => (instance ??= build()).noSuspense(),
    loading: () => (instance ??= build()).loading(),
    refetch: () => (instance ??= build()).refetch(),
    // Deliberately NOT `??=`: invalidating an unbuilt cache must stay a no-op,
    // or every write-only screen would arm (and fetch) a list nobody reads.
    invalidate: () => instance?.invalidate(),
  };
}
