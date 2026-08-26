/*
 * Programmatic navigation for code that has no router context — today the
 * plugin SDK's `navigateTo` (spec/plugins/sdk-contract.md § SDK surface:
 * "route/link primitives ... so plugins never hardcode host routes").
 *
 * `useNavigate()` is a hook: it reads the router context, so it is only
 * callable from a component under `<Router>`. A plugin's click handler is
 * neither — it runs after render, in a module that compiled against the SDK
 * alone and can never see `@solidjs/router`, because routing reaches plugins as
 * an SDK re-export precisely so the router stays internal and swappable
 * (kdd/plugin-loading § the closed import set; kdd/router).
 *
 * One binding bridges the two, and it is deliberately the smallest thing that
 * can: ONE writer (ShellLayout, which owns navigation) and ONE reader (the
 * SDK), both nameable from here — a directly traceable call, not a registry
 * anything may publish to (kdd/explicit-composition).
 *
 * The binding is MODULE STATE, so writer and reader must resolve to the SAME
 * instance of this module. That holds today because a plugin's
 * `@openmsupply/plugin-sdk` resolves through the host's import map to the
 * host's own live instance (kdd/plugin-loading), whose entry imports this file
 * directly. If the SDK were ever bundled separately, its own copy of this
 * module would be one nothing writes, and every `navigateTo` would take the
 * full-reload fallback below — keep this module shared with the SDK entry.
 */
import { getOwner, onCleanup } from 'solid-js';

/**
 * Navigate to an ALREADY-RESOLVED href — mount base included, exactly the
 * string an `<a href>` in this app carries (`/rc/{store}/inventory/stock`).
 * Resolving is the caller's, because the caller is what knows the store
 * (`storeHref` in the SDK); this end only moves the app there.
 */
export type HostNavigate = (
  href: string,
  options?: { replace?: boolean }
) => void;

let bound: HostNavigate | undefined;

/**
 * Publish the router's navigator for the lifetime of the CALLING COMPONENT —
 * so it must be called from a component body, and the binding is released with
 * that component's owner rather than by anyone remembering to unbind.
 *
 * A call without an owner is refused, not honoured: `onCleanup` would be a
 * no-op, and a binding nothing releases keeps pushing routes into the router
 * of a shell that has since unmounted (logout) — the dangling navigator this
 * module exists to prevent. Reported as a programming error, same contract as
 * the SDK's own no-store guards (plugin-sdk/bridge.ts).
 */
export const bindHostNavigate = (navigate: HostNavigate): void => {
  if (getOwner() === null) {
    console.error(
      'bindHostNavigate: called outside a component body — nothing would ever release the binding, so it was not made'
    );
    return;
  }
  bound = navigate;
  onCleanup(() => {
    // Guarded rather than a bare clear: a remount can bind the new navigator
    // before the old one's cleanup runs, and clearing unconditionally would
    // then unbind the live one.
    if (bound === navigate) bound = undefined;
  });
};

/** The router's `navigate`, as much of its shape as the adapter below uses. */
type RouterNavigate = (
  href: string,
  options: { replace?: boolean; resolve: false }
) => void;

/**
 * The router's navigator as a `HostNavigate` — the adapter ShellLayout binds,
 * named here so the one decision in it is testable without a DOM (there is no
 * DOM in this repo's unit tests, so a rendered `<Router base>` is not available
 * to prove it end to end).
 *
 * That decision is `resolve: false`. The href handed over is ALREADY resolved,
 * mount base included, so the router must not resolve it again: with the
 * default `resolve: true` it prepends the base a second time
 * ('/rc' + '/rc/{store}/…'), and a path matching no route drops the mount
 * entirely — the #1141 failure these primitives exist to prevent, invisible at
 * the root mount where the base is ''. It is also exactly what a click on an
 * `<a href>` does: the router's own anchor handler navigates with
 * `resolve: false` (@solidjs/router dist/data/events.js), which is what makes
 * `navigateTo` and `storeHref` the same destination by construction
 * (AC-PLUG-P4).
 */
export const routerHostNavigate =
  (navigate: RouterNavigate): HostNavigate =>
  (href, options) =>
    navigate(href, { ...options, resolve: false });

/**
 * Whether the document already shows `href` — path and query, trailing slash
 * aside. Consulted only on the unbound fallback below: a document navigation
 * to the current URL is a plain reload, and a reload re-runs the very
 * module-scope code that asked for it (PluginGate re-evaluates the plugin on
 * every load), which is an infinite reload loop, not a navigation.
 */
const atDocumentHref = (href: string): boolean => {
  const [path = '', query = ''] = href.split('?');
  return (
    path.replace(/\/+$/, '') === location.pathname.replace(/\/+$/, '') &&
    query === location.search.replace(/^\?/, '')
  );
};

/**
 * Go to an href. With the router bound (every in-store screen) this is an
 * ordinary client-side navigation.
 *
 * Unbound — nothing routed has mounted, which for a plugin means calling this
 * from module scope during load rather than from a rendered contribution — we
 * go through the document instead of dropping the navigation on the floor. It
 * costs a reload, and it is best-effort rather than exact: unbound is also
 * when the SDK's `storeHref` has the least to resolve with (no store entered
 * addresses the app root; mid store switch it still reads the store being
 * left), so the reload can land on the root guard rather than the named
 * screen. The one thing it must never do is reload the URL already shown —
 * that re-runs the module-scope caller and loops — so a same-destination href
 * is dropped instead.
 */
export const hostNavigate: HostNavigate = (href, options) => {
  if (bound) {
    bound(href, options);
    return;
  }
  // Warned, not silent, on both unbound branches: taking either means a
  // plugin navigated from module scope (or mid store switch), which is worth
  // hearing about even though the fallback copes — same contract as the SDK's
  // no-store reports (plugin-sdk/bridge.ts).
  if (atDocumentHref(href)) {
    console.warn(
      `hostNavigate(${href}): no router bound and the document is already there — dropped (navigating would reload and re-run the caller)`
    );
    return;
  }
  console.warn(
    `hostNavigate(${href}): no router bound — navigating through the document, which reloads the app`
  );
  if (options?.replace) location.replace(href);
  else location.assign(href);
};
