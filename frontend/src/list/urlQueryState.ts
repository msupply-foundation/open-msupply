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
// We do not validate the JSON against `T`. A hand-edited or stale URL that carries
// a bad value (e.g. an unknown enum) simply flows into the query and comes back as
// a GraphQL error — which the global error modal surfaces (see graphqlFetch). That
// is the right user-facing outcome for a malformed link; guarding every field here
// would be a lot of machinery to hide an error that should be shown.
//
// Click-through (kdd/explicit-composition): a page calls `useUrlQueryState`, reads the
// current value via the returned accessor, and updates it by calling `setState`
// directly — no subscribers, no shared store.

const QUERY_PARAM = 'query';

export type UrlQueryState<T> = {
  /** Current parsed state, merged over the supplied default. Reactive. */
  state: Accessor<T>;
  /**
   * Replace the state. Passing the default (or an object that serialises to it)
   * clears the param so a pristine list has a clean URL. Navigation is a replace
   * by default (filter/sort/page changes are not distinct history entries);
   * pass { push: true } to add a history entry.
   */
  setState: (next: T, options?: { push?: boolean }) => void;
};

export function useUrlQueryState<T extends object>(defaultState: T): UrlQueryState<T> {
  const [searchParams, setSearchParams] = useSearchParams<{ query: string }>();

  const state = (): T => {
    const raw = searchParams.query;
    if (!raw) return defaultState;
    try {
      // Merge over the default so a partial/older URL still yields a full state.
      return { ...defaultState, ...(JSON.parse(raw) as Partial<T>) };
    } catch {
      return defaultState;
    }
  };

  const setState = (next: T, options?: { push?: boolean }) => {
    const serialised = JSON.stringify(next);
    // A state equal to the default is represented by the absence of the param.
    const query = serialised === JSON.stringify(defaultState) ? null : serialised;
    setSearchParams({ [QUERY_PARAM]: query }, { replace: !options?.push });
  };

  return { state, setState };
}
