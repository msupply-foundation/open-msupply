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
 * Two gate classes, distinguished by whose condition they read (spec/navigation
 * § the gate vocabulary). Both hide the destination; they differ at the URL:
 *
 *   capability  the store/deployment lacks the function → the destination is
 *               ABSENT everywhere and its route redirects to the dashboard
 *               (D70 generalised).
 *   permission  the store has the function, the user lacks the query
 *               permission → the destination is ABSENT for that user, and its
 *               URL shows a no-permission notice in place of the screen — no
 *               dialog, no redirect (D94; OMS-REG-NAV-01.19). The server
 *               stays the real guard.
 *
 * Both are applied by gateNav / routeAccess. These read runtime signals the
 * static nav model cannot, so they live here rather than in navConfig, which
 * stays a plain declarative tree. Reactive: call them inside a memo or a
 * render.
 */

const CAPABILITY_PREDICATES: Record<NavCapability, () => boolean> = {
  dispensary: isDispensary,
  programModule: hasProgramModule,
  vaccineModule: hasVaccineModule,
  procurement: hasProcurement,
  central: isCentralServer,
  // A server admin on a central server — admin plumbing, a capability gate
  // that happens to read the user (spec/navigation § central administration).
  centralAdmin: () => isCentralServer() && hasPermission('SERVER_ADMIN'),
};

/** Whether a single capability gate passes (absent gate = always). */
export const capabilityPasses = (gate?: NavCapability): boolean =>
  gate === undefined || CAPABILITY_PREDICATES[gate]();

/** Whether the user holds an item's query permission (absent gate = always). */
export const permissionPasses = (item: {
  permission?: NavConfigItem['permission'];
}): boolean => item.permission === undefined || hasPermission(item.permission);

/** Both gate classes together — the one test of whether an item is offered. */
const offered = (item: {
  gate?: NavCapability;
  permission?: NavConfigItem['permission'];
}): boolean => capabilityPasses(item.gate) && permissionPasses(item);

/**
 * Gate a nav tree for display: drop items whose capability gate fails or whose
 * query permission the user lacks (a child's gates compose with its
 * section's), and drop a section left with no children — a section none of
 * whose destinations are offered is itself absent, whichever gate class
 * emptied it (spec/navigation § capability gates, § permission gates; D94).
 *
 * Generic over the item shape so it serves both `navModel`'s presentation
 * `NavItem` (with icons, for the menu) and `navConfig`'s plain one (for the
 * palette) without either growing a dependency on the other. An item keeps its
 * reference when nothing under it changed, so ShellLayout's memo hands
 * MenuBar's <For> stable section objects (kdd/solid-reactivity-pitfalls).
 */
export const gateNav = <
  T extends {
    gate?: NavCapability;
    permission?: NavConfigItem['permission'];
    children?: C[];
  },
  C extends { gate?: NavCapability; permission?: NavConfigItem['permission'] },
>(
  items: T[]
): T[] =>
  items
    .filter(offered)
    .map(item => {
      if (!item.children) return item;
      const kept = item.children.filter(offered);
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
 * A blocked verdict lands the user on Home, silently: the router never explains
 * a destination the store does not have, because there is nothing the user can
 * do about it here and the menu never advertised it. A denied verdict stays
 * put: the page body is a no-permission notice.
 *
 *   { kind: 'ok' }       navigate normally (also: unknown paths — the catch-all
 *                        not-found page owns those)
 *   { kind: 'blocked' }  a capability gate fails — the function does not exist
 *                        here, so there is nothing to explain and the address
 *                        is as dead as a typo (D70 generalised)
 *   { kind: 'denied' }   the function exists, this user lacks the destination's
 *                        query permission → a no-permission notice in place of
 *                        the screen, no dialog, no redirect (D94;
 *                        OMS-REG-NAV-01.19). The URL stays as typed, so gaining
 *                        the permission makes the same address work.
 */
export type RouteAccess =
  | { kind: 'ok' }
  | { kind: 'blocked' }
  | { kind: 'denied' };

// Longest path first, so 'inventory/stocktakes' wins over 'inventory'. The
// registry is static; sort once.
const destinationsByDepth = [...navDestinations].sort(
  (a, b) => b.path.length - a.path.length
);

export const routeAccess = (relativePath: string): RouteAccess => {
  const dest = destinationsByDepth.find(
    d => relativePath === d.path || relativePath.startsWith(`${d.path}/`)
  );
  // Unknown to the registry — the catch-all not-found page's business, not the
  // gates'. An unknown path under a gated section is still judged by that
  // section, since the section matches as a prefix (D70).
  if (!dest) return { kind: 'ok' };

  // navTrail resolves a destination to [section, child?]; compose their gates.
  // Capability is judged first: a function the store does not have redirects
  // (blocked) even when the user would also lack its read — a notice about
  // permissions on a screen the store cannot show would send the user chasing
  // the wrong fix.
  const trail = navTrail(dest.path);
  if (!trail.every(item => capabilityPasses(item.gate)))
    return { kind: 'blocked' };
  return trail.every(permissionPasses) ? { kind: 'ok' } : { kind: 'denied' };
};
