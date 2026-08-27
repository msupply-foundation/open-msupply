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
 * A blocked or forbidden verdict lands the user on `navHomePath()` — Home for
 * the full registry, the request list in prescriber mode, which has none.
 *
 *   { kind: 'ok' }                     navigate normally (also: unknown paths,
 *                                      under the FULL registry — the catch-all
 *                                      not-found page owns those. Prescriber
 *                                      mode blocks them instead: most of the
 *                                      app is unknown to its registry, and a
 *                                      not-found page would offer no way back)
 *   { kind: 'blocked' }                a capability gate fails, or the registry
 *                                      in force does not offer the path at all
 *                                      (D70 generalised)
 *   { kind: 'forbidden', permission }  the user lacks the destination's query
 *                                      permission → the landing screen + the
 *                                      permission-denied dialog (D94), naming
 *                                      `permission` (PascalCase, ready for
 *                                      reportPermissionDenied)
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

export const routeAccess = (relativePath: string): RouteAccess => {
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

  // The trail resolves a destination to [section, child?]; compose their gates.
  const trail = activeNavTrail(dest.path);
  if (!trail.every(item => capabilityPasses(item.gate)))
    return { kind: 'blocked' };

  const permission = deniedPermission(dest);
  return permission === undefined
    ? { kind: 'ok' }
    : { kind: 'forbidden', permission };
};
