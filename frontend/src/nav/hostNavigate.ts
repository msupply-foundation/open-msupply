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
 */
import { onCleanup } from 'solid-js';

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
 */
export const bindHostNavigate = (navigate: HostNavigate): void => {
  bound = navigate;
  onCleanup(() => {
    // Guarded rather than a bare clear: a remount can bind the new navigator
    // before the old one's cleanup runs, and clearing unconditionally would
    // then unbind the live one.
    if (bound === navigate) bound = undefined;
  });
};

/**
 * Go to an href. With the router bound (every in-store screen) this is an
 * ordinary client-side navigation.
 *
 * Unbound — nothing routed has mounted, which for a plugin means calling this
 * from module scope during load rather than from a rendered contribution — the
 * destination is still exactly right, so we go there through the document
 * instead of dropping the navigation on the floor. It costs a reload, and the
 * app comes back up on the intended screen.
 */
export const hostNavigate: HostNavigate = (href, options) => {
  if (bound) {
    bound(href, options);
    return;
  }
  if (options?.replace) location.replace(href);
  else location.assign(href);
};
