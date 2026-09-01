import {
  hasPermission,
  hasProcurement,
  hasProgramModule,
  hasVaccineModule,
  isDispensary,
  isPrescriberMode,
} from '../store/storeContext';
import { isCentralServer } from '../api/serverInfo';
import {
  flattenNav,
  navConfig,
  prescriberNavConfig,
  prescriberOnlyPaths,
  trailIn,
  PRESCRIBER_HOME_PATH,
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
 * § the gate vocabulary), with the same failure behaviour — absence:
 *
 *   capability  the store/deployment lacks the function → the destination is
 *               ABSENT everywhere and its route redirects to the dashboard
 *               (D70 generalised).
 *   permission  the store has the function, the user lacks the query
 *               permission → the destination is ABSENT for that user, its URL
 *               landing on the dashboard with no dialog (D94). The server
 *               stays the real guard.
 *
 * Both are applied by gateNav / routeAccess. These read runtime signals the
 * static nav model cannot, so they live here rather than in navConfig, which
 * stays a plain declarative tree. Reactive: call them inside a memo or a
 * render.
 */

/**
 * WHICH REGISTRY is in force for the user in the entered store — the full
 * `navConfig`, or the cut-down `prescriberNavConfig`
 * (spec/prescription-requests § prescriber mode).
 *
 * The registry choice sits HERE, one level above the gates, because it answers
 * a different question from them: a gate asks whether one destination is
 * offered, this asks which set of destinations exists at all. Every surface
 * that used to read `navConfig` directly reads this instead, so the menu, the
 * palette and the router keep agreeing about where the user can go — the
 * property spec/navigation is built on — with prescriber mode as just another
 * thing they agree about.
 *
 * Reactive (reads isPrescriberMode → the store context): switching to a store
 * where the user is a prescriber reshapes all three surfaces in place. Call it
 * inside a memo or a render, like the predicates below.
 */
export const activeNavConfig = (): NavConfigItem[] =>
  isPrescriberMode() ? prescriberNavConfig : navConfig;

/** Every destination in the registry in force — one route each (App.tsx). */
export const activeNavDestinations = (): NavConfigItem[] =>
  flattenNav(activeNavConfig());

/** The breadcrumb trail for a path, within the registry in force. */
export const activeNavTrail = (path: string): NavConfigItem[] =>
  trailIn(activeNavConfig(), path);

/**
 * Where a route the registry in force does not offer sends the user. Home for
 * everyone else; prescriber mode has no Home, so its landing screen stands in
 * (spec/prescription-requests § prescriber mode). Store-relative — the caller
 * prefixes the store id.
 */
export const navHomePath = (): string =>
  isPrescriberMode() ? PRESCRIBER_HOME_PATH : '';

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
 * A blocked or forbidden verdict lands the user on `navHomePath()` — Home for
 * the full registry, the request list in prescriber mode, which has none.
 *
 *   { kind: 'ok' }                     navigate normally (also: unknown paths,
 *                                      under the FULL registry — the catch-all
 *                                      not-found page owns those. Prescriber
 *                                      mode blocks them instead: most of the
 *                                      app is unknown to its registry, and a
 *                                      not-found page would offer no way back)
 *   { kind: 'blocked' }                a capability gate fails, the user lacks
 *                                      the destination's query permission, or
 *                                      the registry in force does not offer the
 *                                      path at all → the landing screen,
 *                                      silently (D70 generalised; D94)
 *   { kind: 'forbidden', permission }  prescriber mode is the only way in and
 *                                      this user is not in it → the landing
 *                                      screen + the permission-denied dialog,
 *                                      naming `permission` (PascalCase, ready
 *                                      for reportPermissionDenied). The one
 *                                      refusal D94 leaves standing: it answers
 *                                      "you are not a prescriber", not "you
 *                                      lack this read", which now hides.
 */
export type RouteAccess =
  | { kind: 'ok' }
  | { kind: 'blocked' }
  | { kind: 'forbidden'; permission: string };

// Longest path first, so 'inventory/stocktakes' wins over 'inventory'. Sorted
// per call rather than once at module scope: which registry is in force is a
// runtime fact now (activeNavConfig), and a module-level sort would freeze
// whichever one happened to be in force at import time.
const destinationsByDepth = (): NavConfigItem[] =>
  [...activeNavDestinations()].sort((a, b) => b.path.length - a.path.length);

/**
 * The PascalCase spelling of the prescriber-mode permission — the wire's
 * HasPermission(...) form, which reportPermissionDenied's dialog humanises.
 */
const PRESCRIBER_MODE_DENIAL = 'PrescriberMode';

/** Whether a path is one of the prescriber registry's own (or beneath it). */
const isPrescriberOnly = (relativePath: string): boolean =>
  prescriberOnlyPaths.some(
    path => relativePath === path || relativePath.startsWith(`${path}/`)
  );

export const routeAccess = (relativePath: string): RouteAccess => {
  // PRESCRIBER MODE IS THE ONLY WAY IN (spec/prescription-requests § prescriber
  // mode, PM-9). Its own destinations are absent from the full registry, but
  // absence alone would not stop an ordinary user typing the address:
  // Dispensary claims every path beneath it, so a typed
  // 'dispensary/prescription-request' would pass on the section's gate.
  // Refusing is also the more honest answer than a silent redirect — the user
  // is told what they lack, in the dialog every other refusal uses.
  if (!isPrescriberMode() && isPrescriberOnly(relativePath))
    return { kind: 'forbidden', permission: PRESCRIBER_MODE_DENIAL };

  // A SECTION must be matched exactly in prescriber mode. The prefix rule
  // exists so a record screen is judged by its list ('inventory/stocktakes/123'
  // by 'inventory/stocktakes'), but a section's landing page has no record
  // screens — and letting Dispensary claim everything beneath it would admit
  // 'dispensary/prescription', a destination the prescriber registry
  // deliberately does not offer (§ PM-3). For the full registry the rule is
  // unchanged: an unknown path under a gated section still redirects rather
  // than reaching the not-found page (D70).
  const exactSectionsOnly = isPrescriberMode();
  const dest = destinationsByDepth().find(
    d =>
      relativePath === d.path ||
      ((!exactSectionsOnly || !d.children) &&
        relativePath.startsWith(`${d.path}/`))
  );
  // Unknown to the registry in force. For everyone else that is the
  // not-found page's business, and it still is — but in prescriber mode most
  // of the app is unknown to the registry, and a prescriber who followed a
  // stale /inventory/stock link should land on their own screen, not on a
  // not-found page that offers no way back. So: unknown paths pass for the
  // full registry, and are blocked (→ the prescriber's landing screen) for the
  // cut-down one. The catch-all not-found route still owns genuinely
  // nonexistent paths for everyone with the full registry.
  if (!dest) return isPrescriberMode() ? { kind: 'blocked' } : { kind: 'ok' };

  // The trail resolves a destination to [section, child?]; compose their gates
  // — both classes, so a permission-withheld URL is as unreachable as a
  // capability-gated one (D94).
  const trail = activeNavTrail(dest.path);
  return trail.every(offered) ? { kind: 'ok' } : { kind: 'blocked' };
};
