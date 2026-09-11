import { useSearchParams } from '@solidjs/router';
import type { Accessor } from 'solid-js';

// kdd/url-structure: filter, sort and pagination live in a
// single JSON query parameter (`?query=…`) rather than being spread across
// conventional URL params. Parsing conventional params would only rebuild a
// JSON-like structure anyway, so we store the JSON directly.
//
// The stored value is whatever the list page's variables need — filter / sort /
// page conforming to the generated GraphQL input types (kdd/type-safety: no
// remapping). This helper is generic over that shape; each list page
// supplies its own `T` (e.g. StocktakesListState) and a default.
//
// We do not validate the JSON against `T`. A hand-edited or stale URL that
// carries a bad value (e.g. an unknown enum) simply flows into the query and
// comes back as a GraphQL error — which the global error modal surfaces (see
// graphqlFetch). That is the right user-facing outcome for a malformed link;
// guarding every field here would be a lot of machinery to hide an error that
// should be shown.
//
// Click-through (kdd/explicit-composition): a page calls `useUrlQueryState`,
// reads the current value via the returned `query` accessor, and updates it by
// calling `setQuery` directly — no subscribers, no shared store.

const QUERY_PARAM = 'query';

export type UrlQueryState<T> = {
  /** Current parsed query state, merged over the supplied default. Reactive. */
  query: Accessor<T>;
  /**
   * Replace the query state. Passing the default (or an object that serialises
   * to it) clears the param so a pristine list has a clean URL. Navigation is
   * a replace by default (filter/sort/page changes are not distinct history
   * entries); pass { push: true } to add a history entry. Other search params
   * that must change together with the state (a `?tab=`) go in `params`, so
   * they ride the same navigation — a separate setSearchParams call would be
   * built from the address before this one and undo it.
   */
  setQuery: (
    next: T,
    options?: { push?: boolean; params?: Record<string, string | undefined> }
  ) => void;
};

export function useUrlQueryState<T extends object>(
  defaultState: T
): UrlQueryState<T> {
  const [searchParams, setSearchParams] = useSearchParams<{ query: string }>();

  /*
   * The newest state, held from the moment setQuery hands it over until the
   * address bar shows it — so `query()` never describes a state that has
   * already been changed.
   *
   * Changing the state means asking the router for a new address, and the
   * router only carries out the LAST address asked for in one go
   * (@solidjs/router `transition`: "last call to transition wins"), building
   * each from the address bar as it still reads. So a second change built on
   * `query()` would undo the first. That is one click of "Clear all": the bar
   * clears its own filters, then the custom-field ones, each through its
   * page's own setQuery.
   *
   * The address bar stays the one home of the state — this only covers the
   * moment in between, and is let go of as soon as it has passed.
   */
  let latestState: T | undefined;

  const query = (): T => {
    // Read the parameter FIRST, always — even when the answer comes from
    // latestState. Reading it is what makes a component re-render when the
    // address changes; skip it, and a component that asked mid-change is left
    // watching nothing and keeps its old value on screen (a filter chip still
    // showing text that "Clear all" had removed).
    const raw = searchParams.query;
    if (latestState !== undefined) return latestState;
    if (!raw) return defaultState;
    try {
      // Merge over the default so a partial/older URL still yields a full
      // state. Explicit nulls are dropped FIRST — `{"sort": null}` must fall
      // back to the default, not override it and crash an accessor
      // client-side; anything else malformed still degrades to a GraphQL
      // error per the contract above.
      const parsed = Object.fromEntries(
        Object.entries(JSON.parse(raw) as Partial<T>).filter(
          ([, value]) => value != null
        )
      ) as Partial<T>;
      return { ...defaultState, ...parsed };
    } catch {
      return defaultState;
    }
  };

  const setQuery = (
    next: T,
    options?: { push?: boolean; params?: Record<string, string | undefined> }
  ) => {
    // Hold it, so a change made alongside this one builds on it rather than on
    // the address bar it has left behind.
    if (latestState === undefined)
      queueMicrotask(() => (latestState = undefined));
    latestState = next;
    const serialised = JSON.stringify(next);
    // A state equal to the default is represented by the absence of the param.
    const serialisedOrNull =
      serialised === JSON.stringify(defaultState) ? null : serialised;
    // Any other search params that must change WITH the state (a `?tab=`, say)
    // travel in this same navigation: the router builds every address from
    // the location as it still reads and carries out only the last one asked
    // for, so a separate setSearchParams call would undo this one.
    setSearchParams(
      { ...options?.params, [QUERY_PARAM]: serialisedOrNull },
      { replace: !options?.push }
    );
  };

  return { query, setQuery };
}
