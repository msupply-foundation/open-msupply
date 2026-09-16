/*
 * The router's current query string, for code that must not import the router
 * — today the plugin SDK's `usePageSearch` (spec/plugins/sdk-contract.md § the
 * page contribution: a page's query is its own to read).
 *
 * Same binding as ./hostNavigate.ts, for the same two reasons: the router
 * stays internal and swappable (kdd/router), and the SDK entry stays free of
 * the router's module-scope side effects — `@solidjs/router` touches `window`
 * at import time, which a DOM-less environment (the unit tests, any static
 * evaluation of a plugin bundle) cannot survive. ONE writer (ShellLayout) and
 * ONE reader (the SDK); module state, so both must resolve to the same
 * instance of this module — which the import map guarantees today
 * (kdd/plugin-loading).
 */
import { getOwner, onCleanup } from 'solid-js';

let bound: (() => string) | undefined;

/**
 * Publish the router's reactive `location.search` for the lifetime of the
 * calling component — the contract `bindHostNavigate` documents, including
 * the refusal without an owner (a binding nothing releases would keep
 * answering from a shell that has since unmounted).
 */
export const bindHostSearch = (read: () => string): void => {
  if (getOwner() === null) {
    console.error(
      'bindHostSearch: called outside a component body — nothing would ever release the binding, so it was not made'
    );
    return;
  }
  bound = read;
  onCleanup(() => {
    if (bound === read) bound = undefined;
  });
};

/**
 * The current query string (`?a=b` or ``). Reactive when the shell's binding
 * is live — the bound accessor reads the router's own location signal — and
 * falling back to the document's URL where it is not (before the shell
 * mounts, or in an environment with no shell), so a caller always gets an
 * answer rather than a throw.
 */
export const hostSearch = (): string =>
  bound?.() ?? (typeof window === 'undefined' ? '' : window.location.search);
