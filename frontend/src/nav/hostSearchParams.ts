/*
 * Reading and writing the address bar's QUERY STRING for code that has no
 * router context — today the plugin SDK's list state, the same need and the
 * same shape as ./hostNavigate.ts, which this file deliberately mirrors.
 *
 * `useSearchParams()` is a hook: it reads the router context, so it is only
 * callable from a component under `<Router>`. A plugin page is rendered under
 * one, but it compiled against the SDK alone and can never see
 * `@solidjs/router` — routing reaches plugins as host-owned functions
 * precisely so the router stays internal and swappable (kdd/plugin-loading §
 * the closed import set; kdd/router). Importing it into the SDK's entry would
 * also drag `window`-at-module-scope into every DOM-free unit test that
 * touches the SDK.
 *
 * As with hostNavigate, the binding is the smallest thing that can bridge the
 * two: ONE writer (ShellLayout, which owns navigation) and ONE reader (the
 * SDK), both nameable from here.
 *
 * Only the READ needs binding. The write is built from `hostNavigate`, which
 * already owns the one subtle decision in this area (`resolve: false` against
 * an already-resolved href) and is tested for it — so there is no second copy
 * of that reasoning here.
 */
import { getOwner, onCleanup } from 'solid-js';
import { hostNavigate } from './hostNavigate';

/** The document's current query string, `?a=b` form. Reactive at the source. */
export type HostSearch = () => string;

let bound: HostSearch | undefined;

/**
 * Publish the router's reactive query string for the lifetime of the CALLING
 * COMPONENT — so it must be called from a component body, and the binding is
 * released with that component's owner rather than by anyone remembering to
 * unbind. A call without an owner is refused, not honoured, for the reason
 * `bindHostNavigate` gives.
 */
export const bindHostSearch = (read: HostSearch): void => {
  if (getOwner() === null) {
    console.error(
      'bindHostSearch: called outside a component body — nothing would ever release the binding, so it was not made'
    );
    return;
  }
  bound = read;
  onCleanup(() => {
    // Guarded rather than a bare clear: a remount can bind the new reader
    // before the old one's cleanup runs, and clearing unconditionally would
    // then unbind the live one.
    if (bound === read) bound = undefined;
  });
};

/**
 * One search parameter's current value, or `undefined`.
 *
 * REACTIVE through the binding — reading it subscribes the caller to address
 * changes, which is what makes a list screen re-render on Back. Unbound
 * (nothing routed has mounted) it reads empty rather than throwing: a screen
 * then shows its default state, which is the same thing an address with no
 * parameter means.
 */
export const hostSearchParam = (name: string): string | undefined =>
  new URLSearchParams(bound?.() ?? '').get(name) ?? undefined;

/**
 * The whole current query string (`?a=b` form, or ``) — for the SDK's
 * page-level reader (plugin-sdk/pageSearch.ts), which hands a page its own
 * `URLSearchParams` rather than one named value. Same binding, same
 * reactivity, same unbound-reads-empty rule as `hostSearchParam`.
 */
export const hostSearch = (): string => bound?.() ?? '';

/**
 * Set or clear search parameters — `null`/`undefined` removes one — in ONE
 * navigation, leaving the path and every other parameter alone.
 *
 * Replaces by default: a filter, sort or page change is not a distinct history
 * entry. The href handed to `hostNavigate` is built from the document's own
 * address, so it already carries the mount base, which is exactly what that
 * function expects.
 */
export const setHostSearchParams = (
  params: Record<string, string | null | undefined>,
  options?: { push?: boolean }
): void => {
  const url = new URL(window.location.href);
  for (const [name, value] of Object.entries(params)) {
    if (value === null || value === undefined) url.searchParams.delete(name);
    else url.searchParams.set(name, value);
  }
  hostNavigate(`${url.pathname}${url.search}`, { replace: !options?.push });
};
