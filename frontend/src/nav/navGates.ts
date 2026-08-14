import {
  hasPermission,
  hasProcurement,
  hasProgramModule,
  hasVaccineModule,
  isDispensary,
} from '../store/storeContext';
import { isCentralServer } from '../api/serverInfo';
import {
  navDestinations,
  navTrail,
  type NavCapability,
  type NavItem as NavConfigItem,
} from './navConfig';

/*
 * The gate interpreter for the navigation registry (spec/navigation ›
 * behaviours). navConfig declares each destination's gates; this file supplies
 * the runtime predicates and applies them, shared by the MENU, the COMMAND
 * PALETTE, and the ROUTER so the three surfaces can never disagree about where
 * the user can go (spec/navigation § one registry, three surfaces; keyboard
 * KB-R1/KB-R2).
 *
 * Two gate classes with different failure behaviour (spec/navigation § the
 * gate vocabulary):
 *
 *   capability  the store/deployment lacks the function → the destination is
 *               ABSENT everywhere and its route redirects to the dashboard
 *               (D70 generalised). Applied by gateNav / routeAccess.
 *   permission  the store has the function, the user lacks the query
 *               permission → the destination stays VISIBLE; activating it (or
 *               its URL) refuses with the permission-denied dialog instead of
 *               navigating (D94). Applied by deniedPermission / routeAccess —
 *               never by gateNav.
 *
 * These read runtime signals the static nav model cannot, so they live here
 * rather than in navConfig, which stays a plain declarative tree. Reactive:
 * call them inside a memo or a render.
 */

const CAPABILITY_PREDICATES: Record<NavCapability, () => boolean> = {
  dispensary: isDispensary,
  programModule: hasProgramModule,
  vaccineModule: hasVaccineModule,
  procurement: hasProcurement,
  central: isCentralServer,
  // A server admin on a central server — admin plumbing hides like a
  // capability rather than refusing like a permission gate (spec/navigation §
  // central administration; decided with D94).
  centralAdmin: () => isCentralServer() && hasPermission('SERVER_ADMIN'),
};

/** Whether a single capability gate passes (absent gate = always). */
export const capabilityPasses = (gate?: NavCapability): boolean =>
  gate === undefined || CAPABILITY_PREDICATES[gate]();

/**
 * The permission a destination's activation must hold, when the user lacks it —
 * undefined means "go ahead". The name is returned in the PascalCase form
 * reportPermissionDenied expects (the wire's HasPermission(...) spelling, which
 * the modal humanises), converted from the enum's SCREAMING_CASE.
 */
export const deniedPermission = (item: {
  permission?: NavConfigItem['permission'];
}): string | undefined =>
  item.permission !== undefined && !hasPermission(item.permission)
    ? item.permission
        .toLowerCase()
        .replace(/(^|_)([a-z])/g, (_, __, letter: string) =>
          letter.toUpperCase()
        )
    : undefined;

/**
 * Gate a nav tree for display: drop capability-gated items whose gate fails
 * (a child's gate composes with its section's), and drop a section left with
 * no children — a section none of whose destinations are offered is itself
 * absent (spec/navigation § capability gates). Permission gates deliberately
 * do NOT filter here (D94: visible, refused on activation).
 *
 * Generic over the item shape so it serves both `navModel`'s presentation
 * `NavItem` (with icons, for the menu) and `navConfig`'s plain one (for the
 * palette) without either growing a dependency on the other. An item keeps its
 * reference when nothing under it changed, so ShellLayout's memo hands
 * MenuBar's <For> stable section objects (kdd/solid-reactivity-pitfalls).
 */
export const gateNav = <
  T extends { gate?: NavCapability; children?: C[] },
  C extends { gate?: NavCapability },
>(
  items: T[]
): T[] =>
  items
    .filter(item => capabilityPasses(item.gate))
    .map(item => {
      if (!item.children) return item;
      const kept = item.children.filter(child => capabilityPasses(child.gate));
      return kept.length === item.children.length
        ? item
        : { ...item, children: kept };
    })
    .filter(item => !item.children || item.children.length > 0);

/**
 * Route-guard verdict for a store-relative path (spec/navigation: the router
 * is the registry's third surface). Matches the deepest destination whose path
 * is a segment-prefix of the given path — 'inventory/stocktakes/123' is judged
 * by the 'inventory/stocktakes' destination — and composes the trail's gates,
 * so a child is unreachable while its section is.
 *
 *   { kind: 'ok' }                     navigate normally (also: unknown paths —
 *                                      the catch-all not-found page owns those)
 *   { kind: 'blocked' }                a capability gate fails → dashboard (D70)
 *   { kind: 'forbidden', permission }  the user lacks the destination's query
 *                                      permission → dashboard + the
 *                                      permission-denied dialog (D94), naming
 *                                      `permission` (PascalCase, ready for
 *                                      reportPermissionDenied)
 */
export type RouteAccess =
  | { kind: 'ok' }
  | { kind: 'blocked' }
  | { kind: 'forbidden'; permission: string };

// Longest path first, so 'inventory/stocktakes' wins over 'inventory'. The
// registry is static; sort once.
const destinationsByDepth = [...navDestinations].sort(
  (a, b) => b.path.length - a.path.length
);

export const routeAccess = (relativePath: string): RouteAccess => {
  const dest = destinationsByDepth.find(
    d => relativePath === d.path || relativePath.startsWith(`${d.path}/`)
  );
  if (!dest) return { kind: 'ok' };

  // navTrail resolves a destination to [section, child?]; compose their gates.
  const trail = navTrail(dest.path);
  if (!trail.every(item => capabilityPasses(item.gate)))
    return { kind: 'blocked' };

  const permission = deniedPermission(dest);
  return permission === undefined
    ? { kind: 'ok' }
    : { kind: 'forbidden', permission };
};
