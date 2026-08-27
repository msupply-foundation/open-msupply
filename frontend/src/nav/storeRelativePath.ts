/*
 * Where the app is mounted, and the path below the store root — the one place
 * either is worked out.
 *
 * Issue #1141: solid-router's `base` is prepended to route PATTERNS, never
 * stripped from the location — its browser integration feeds it
 * `window.location.pathname` verbatim (@solidjs/router
 * dist/routers/Router.js). So on a nested mount `useLocation().pathname` reads
 * '/rc/{store}/inventory/stocktakes', and hand-stripping only '/{store}' left
 * the base in the string. Nothing matched: the menu highlighted nothing and
 * its section stayed shut (chrome OMS-REG-FTR-02.4/.19/.21), the breadcrumb
 * lost its section glyph (chrome § app bar), the tab title fell back (.27),
 * the keyboard's navigate-up walked to a garbage path (keyboard KB-X5) — and
 * routeAccess found no destination, so every capability and permission route
 * gate silently passed (navigation OMS-REG-NAV-01.16/.20).
 *
 * A nested mount is not one exotic track: deploy/build-and-deploy.sh mounts
 * every branch deploy at its own BASE_PATH ('/pr-123/'), alongside the
 * deployed /rc/ track. Local dev and CI both run at the root, where the base
 * is '' and the old derivation was correct — which is why this was invisible
 * to everyone writing the code and plain to anyone reviewing a deploy.
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
 *
 * The mount comes off first and unconditionally, the store segment behind a
 * guard. Deliberate: a path that is somehow NOT under '/{store}' still comes
 * back mount-free, because a leaked mount is exactly what leaves routeAccess
 * with no destination to judge — and that fails OPEN. In this app the guard
 * cannot miss (ShellLayout and KeyboardHost both sit under the '/:storeId'
 * route, and solid-router hands params through undecoded, so the segment is
 * always the literal one in the pathname), which is also why a miss doesn't
 * warn: it would only ever fire on a routing transition where location and
 * params disagree for a frame.
 */
export const storeRelativePath = (
  pathname: string,
  storeId: string
): string => {
  const belowMount = pathname.startsWith(routerBase)
    ? pathname.slice(routerBase.length)
    : pathname;
  const prefix = `/${storeId}`;
  const rest = belowMount.startsWith(prefix)
    ? belowMount.slice(prefix.length)
    : belowMount;
  return rest.replace(/^\/+|\/+$/g, '');
};
