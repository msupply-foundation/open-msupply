import { useSyncExternalStore } from 'react';

/*
 * ⚠️ TEMPORARY — hand-rolled URL query-param state, to be REPLACED by router
 * hooks once the routing decision (#9) lands.
 *
 * TanStack Router's `useSearch()` (or nuqs) give typed, structurally-shared
 * search-param state out of the box. This module is a minimal stand-in so we can
 * adopt the "URL query params are the source of truth" pattern NOW without
 * pulling in a router. When the router is chosen: delete this file and point the
 * call sites (FilterBar, TableShowcase) at the router's search hooks — they
 * read/write "URL state", not this module, so the swap is mechanical.
 *
 * Referential stability: the single external source is the raw `location.search`
 * STRING (compared by value via useSyncExternalStore). Callers parse it inside a
 * useMemo keyed on that string, so the same URL yields the same parsed reference
 * — the table's columnFilters don't churn between renders.
 */

// history.pushState/replaceState fire no event, so patch them once to notify.
const listeners = new Set<() => void>();
let patched = false;

const notify = () => listeners.forEach(l => l());

type HistoryMutator = History['pushState'];

const ensurePatched = () => {
  if (patched || typeof window === 'undefined') return;
  patched = true;
  (['pushState', 'replaceState'] as const).forEach(method => {
    const original = history[method].bind(history) as HistoryMutator;
    history[method] = function (...args: Parameters<HistoryMutator>) {
      original(...args);
      notify();
    };
  });
  window.addEventListener('popstate', notify);
};

const subscribe = (listener: () => void) => {
  ensurePatched();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () =>
  typeof window === 'undefined' ? '' : window.location.search;

/** The raw `?a=b&c=d` search string, kept in sync with the URL. */
export const useSearchString = (): string =>
  useSyncExternalStore(subscribe, getSnapshot, () => '');

const writeParams = (params: URLSearchParams) => {
  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
  // replaceState (not push) so typing in a filter doesn't spam the back stack.
  history.replaceState(history.state, '', url);
};

/** Set a param (string or repeated list), or remove it when the value is empty. */
export const setUrlParam = (key: string, value: string | string[] | null) => {
  const params = new URLSearchParams(window.location.search);
  params.delete(key);
  if (Array.isArray(value)) value.forEach(v => params.append(key, v));
  else if (value) params.set(key, value);
  writeParams(params);
};

/** Remove several params at once (e.g. "clear all filters"). */
export const clearUrlParams = (keys: string[]) => {
  const params = new URLSearchParams(window.location.search);
  keys.forEach(k => params.delete(k));
  writeParams(params);
};
