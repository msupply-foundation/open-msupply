/*
 * The router's reactive pathname for code that has no router context — today
 * the plugin SDK's `currentStorePath` (spec/plugins/sdk-contract.md § SDK
 * surface: the navigation read primitive, so a page can interpret the paths
 * below its own without seeing `@solidjs/router`).
 *
 * The same binding shape as ./hostNavigate, for the same reason: ONE writer
 * (ShellLayout, which owns navigation and already reads `useLocation`) and ONE
 * reader (the SDK), both nameable from here — a directly traceable call, not a
 * registry (kdd/explicit-composition). Module state, so writer and reader must
 * resolve to the SAME instance of this module — which holds while the SDK
 * resolves through the host's import map (kdd/plugin-loading); see
 * hostNavigate.ts for the full account.
 *
 * What is bound is an ACCESSOR over the router's reactive location, not a
 * snapshot: a read inside a tracking scope (a component's JSX, a memo)
 * re-runs on navigation, which is what lets a plugin page treat the paths
 * below its own as view state.
 */
import { getOwner, onCleanup } from 'solid-js';

/** A reactive read of the router's current pathname (document-space). */
export type HostPathname = () => string;

let bound: HostPathname | undefined;

/**
 * Publish the router's reactive pathname for the lifetime of the CALLING
 * COMPONENT — same contract as `bindHostNavigate`: called from a component
 * body, released with that component's owner, and refused (reported, not
 * honoured) without one.
 */
export const bindHostPathname = (pathname: HostPathname): void => {
  if (getOwner() === null) {
    console.error(
      'bindHostPathname: called outside a component body — nothing would ever release the binding, so it was not made'
    );
    return;
  }
  bound = pathname;
  onCleanup(() => {
    // Guarded rather than a bare clear: a remount can bind the new accessor
    // before the old one's cleanup runs (see bindHostNavigate).
    if (bound === pathname) bound = undefined;
  });
};

/**
 * The current pathname, reactively where the router is bound (every in-store
 * screen). Unbound — before the shell mounts, or after logout — it falls back
 * to the document's own pathname: correct but non-reactive, which is fine for
 * the one frame in which nothing routed is rendered anyway.
 */
export const hostPathname = (): string =>
  bound !== undefined ? bound() : location.pathname;
