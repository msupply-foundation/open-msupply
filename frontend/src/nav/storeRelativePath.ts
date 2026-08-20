/*
 * Where the app is mounted, and the path below the store root — the one place
 * either is worked out.
 *
 * Issue #1141: solid-router's `base` is prepended to route PATTERNS, never
 * stripped from the location — its browser integration feeds it
 * `window.location.pathname` verbatim (@solidjs/router
 * dist/routers/Router.js). So on a nested mount (the deployed /rc/ track)
 * `useLocation().pathname` reads '/rc/{store}/inventory/stocktakes', and
 * hand-stripping only '/{store}' left the base in the string. Nothing matched:
 * the menu highlighted nothing, the breadcrumb lost its section glyph, the tab
 * title fell back, the keyboard's navigate-up walked to a garbage path — and
 * routeAccess found no destination, so every capability and permission route
 * gate silently passed. None of it reproduced at the root mount, where the
 * base is ''.
 */

/**
 * Vite's base, trimmed of its trailing '/' (Vite's convention is to always
 * have one) — '' at the root mount, '/rc' on the nested track.
 *
 * The trim is load-bearing for the router: solid-router's root-route
 * resolution doesn't strip it before concatenating an absolute `to` (e.g.
 * navigate(`/${id}`) in StoreGuardLayout), producing a double slash —
 * '/rc//id' — that matches no route and drops the base entirely.
 */
export const routerBase = import.meta.env.BASE_URL.replace(/\/$/, '');

/**
 * The path below the store root, as the nav registry spells it:
 * '/rc/{store}/inventory/stocktakes/1' → 'inventory/stocktakes/1'.
 * The empty result is the store root, which IS the dashboard.
 *
 * Takes the location's pathname rather than reading it, so it stays a pure
 * function of (URL, store) and can be tested without a router.
 */
export const storeRelativePath = (
  pathname: string,
  storeId: string
): string => {
  const prefix = `${routerBase}/${storeId}`;
  const rest = pathname.startsWith(prefix)
    ? pathname.slice(prefix.length)
    : pathname;
  return rest.replace(/^\/+|\/+$/g, '');
};
