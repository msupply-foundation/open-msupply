/*
 * The list-state-in-the-URL logic, with no opinion about how the address bar
 * is reached (kdd/url-structure — filter, sort and pagination live in one
 * JSON `?query=` parameter rather than spread across conventional params,
 * since parsing those would only rebuild a JSON-like structure anyway).
 *
 * Split from `./urlQueryState.ts` so it can be used WITHOUT `@solidjs/router`.
 * The host's own hook wires this to `useSearchParams`; the plugin SDK wires it
 * to the host's bound search binding (src/nav/hostSearchParams.ts), because a
 * plugin never sees the router — it is not in the closed import set, and
 * keeping it out is what leaves the host free to change or drop it
 * (kdd/router, kdd/plugin-loading; the same reason `navigateTo` is a
 * host-owned function over a path rather than re-exported router API).
 *
 * Importing the router here would also put it in the SDK's eager entry graph,
 * and `@solidjs/router` touches `window` at module scope — which would make
 * every DOM-free unit test that imports the SDK, for a type or a helper, need
 * a DOM.
 */

/** The single parameter a list screen's whole state travels in. */
export const QUERY_PARAM = 'query';

/** How a query state reaches the address bar. */
export interface QueryParamIO {
  /**
   * The parameter's current raw value. MUST be read REACTIVELY — reading it is
   * what re-runs a component when the address changes.
   */
  read: () => string | undefined;
  /**
   * Write the parameter (`null` clears it) together with any siblings, in ONE
   * navigation. `push` adds a history entry; the default replaces.
   */
  write: (
    value: string | null,
    options?: { push?: boolean; params?: Record<string, string | undefined> }
  ) => void;
}

export type UrlQueryState<T> = {
  /** Current parsed query state, merged over the supplied default. Reactive. */
  query: () => T;
  /**
   * Replace the query state. Passing the default (or an object that serialises
   * to it) clears the param so a pristine list has a clean URL. Navigation is
   * a replace by default (filter/sort/page changes are not distinct history
   * entries); pass { push: true } to add a history entry. Other search params
   * that must change together with the state (a `?tab=`) go in `params`, so
   * they ride the same navigation — a separate write would be built from the
   * address before this one and undo it.
   */
  setQuery: (
    next: T,
    options?: { push?: boolean; params?: Record<string, string | undefined> }
  ) => void;
};

/*
 * We do not validate the JSON against `T`. A hand-edited or stale URL carrying
 * a bad value simply flows into the query and comes back as an error the
 * caller surfaces — the right user-facing outcome for a malformed link;
 * guarding every field here would be a lot of machinery to hide an error that
 * should be shown.
 */
export function createUrlQueryState<T extends object>(
  defaultState: T,
  io: QueryParamIO
): UrlQueryState<T> {
  /*
   * The newest state, held from the moment setQuery hands it over until the
   * address bar shows it — so `query()` never describes a state that has
   * already been changed.
   *
   * Changing the state means asking the router for a new address, and only the
   * LAST address asked for in one go is carried out, each built from the
   * address bar as it still reads. So a second change built on `query()` would
   * undo the first. That is one click of "Clear all": the bar clears its own
   * filters, then the custom-field ones, each through its page's own setQuery.
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
    const raw = io.read();
    if (latestState !== undefined) return latestState;
    if (!raw) return defaultState;
    try {
      // Merge over the default so a partial/older URL still yields a full
      // state. Explicit nulls are dropped FIRST — `{"sort": null}` must fall
      // back to the default, not override it and crash an accessor
      // client-side; anything else malformed still degrades per the contract
      // above.
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
    io.write(serialisedOrNull, options);
  };

  return { query, setQuery };
}
