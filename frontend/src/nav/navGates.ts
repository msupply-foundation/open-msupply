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

/** Whether the destination at a registry path is offered, trail composed. */
const destinationOffered = (path: string): boolean => {
  const trail = navTrail(path);
  return trail.length > 0 && trail.every(offered);
};

/**
 * The supporting gate — whether a supporting destination's principals justify
 * offering it (spec/navigation § supporting destinations;
 * OMS-REG-NAV-01.24/.25). `true` reads the section's other offered children —
 * any non-supporting one will do; a path list reads the named destinations
 * through the registry, composing each one's own trail of gates.
 */
const principalOffered = (
  supporting: NonNullable<NavConfigItem['supporting']>,
  offeredSiblings: readonly { supporting?: NavConfigItem['supporting'] }[]
): boolean =>
  supporting === true
    ? offeredSiblings.some(sibling => sibling.supporting === undefined)
    : supporting.some(destinationOffered);

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
  C extends {
    gate?: NavCapability;
    permission?: NavConfigItem['permission'];
    supporting?: NavConfigItem['supporting'];
  },
>(
  items: T[]
): T[] =>
  items
    .filter(offered)
    .map(item => {
      if (!item.children) return item;
      const gated = item.children.filter(offered);
      // A supporting destination goes with the work it supports: none of its
      // principals offered → it is withheld too, and a section this empties
      // disappears below like any other (OMS-REG-NAV-01.24/.25).
      const kept = gated.filter(
        child =>
          child.supporting === undefined ||
          principalOffered(child.supporting, gated)
      );
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
  { kind: 'ok' } | { kind: 'blocked' } | { kind: 'denied' };

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
  if (!trail.every(permissionPasses)) return { kind: 'denied' };
  if (dest.supporting === undefined) return { kind: 'ok' };

  // A supporting destination composes its principals' gates as an OR, and its
  // verdict takes the class of what withheld them (spec/navigation §
  // supporting destinations; OMS-REG-NAV-01.26): any principal offered → ok;
  // otherwise denied while some principal's function exists here (gaining its
  // read brings both destinations back at this address), blocked when none
  // does.
  const principals =
    dest.supporting === true
      ? (trail[0]?.children ?? []).filter(
          sibling => sibling.supporting === undefined
        )
      : dest.supporting.flatMap(
          path => navDestinations.find(d => d.path === path) ?? []
        );
  if (principals.some(principal => destinationOffered(principal.path)))
    return { kind: 'ok' };
  return principals.some(principal =>
    navTrail(principal.path).every(item => capabilityPasses(item.gate))
  )
    ? { kind: 'denied' }
    : { kind: 'blocked' };
};
