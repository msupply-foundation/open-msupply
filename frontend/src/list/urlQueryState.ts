import { useSearchParams } from '@solidjs/router';
import { createUrlQueryState, QUERY_PARAM } from './urlQueryStateCore';
import type { UrlQueryState } from './urlQueryStateCore';

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
// The LOGIC lives in ./urlQueryStateCore.ts, which knows nothing of the
// router; this file is only its wiring to `useSearchParams`. The split exists
// so the plugin SDK can offer the same state model without `@solidjs/router`
// entering its import graph (see the core's header).
//
// Click-through (kdd/explicit-composition): a page calls `useUrlQueryState`,
// reads the current value via the returned `query` accessor, and updates it by
// calling `setQuery` directly — no subscribers, no shared store.

export type { UrlQueryState } from './urlQueryStateCore';

export function useUrlQueryState<T extends object>(
  defaultState: T
): UrlQueryState<T> {
  const [searchParams, setSearchParams] = useSearchParams<{ query: string }>();
  return createUrlQueryState(defaultState, {
    read: () => searchParams.query,
    // Any other search params that must change WITH the state (a `?tab=`, say)
    // travel in this same navigation: the router builds every address from
    // the location as it still reads and carries out only the last one asked
    // for, so a separate setSearchParams call would undo this one.
    write: (value, options) =>
      setSearchParams(
        { ...options?.params, [QUERY_PARAM]: value },
        { replace: !options?.push }
      ),
  });
}
