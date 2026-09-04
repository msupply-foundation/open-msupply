import { ErrorBoundary, lazy, Suspense } from 'solid-js';
import type { Component } from 'solid-js';
import { t, type LocaleKey } from '../intl';
import { FileIcon, type IconProps } from '../ui/icons';
import { Page } from '../ui/layout/Page/Page';
import { Header } from '../ui/layout/Header/Header';
import { Breadcrumb } from '../ui/layout/Header/Breadcrumb';
import {
  matchLeaf,
  type NavItem,
  type NavLeaf,
} from '../ui/layout/AppShell/navModel';
import type { RouteAccess } from '../nav/navGates';
import { namespacedPluginKey } from '../plugin-sdk/intl';
import type { PluginPage, PluginPageSection } from '../plugin-sdk/types';
import { pageSections, type RegisteredPageSection } from './registry';
import { slotContext } from './slotContext';
import { recordPluginDiagnostic } from './diagnostics';
import { pathsCollide } from './validate';

/*
 * The host side of the `pages` contribution (spec/plugins/rules.md § pages &
 * navigation; sdk-contract § the page contribution).
 *
 * A plugin page is NOT a slot: it joins the host's one navigation registry
 * instead, and this module is the registry's plugin-side half — the menu
 * (ShellLayout), the command palette (navActions), the router (App.tsx +
 * navGates.routeAccess), the breadcrumb icon, the menu highlight, and the tab
 * title all read it, so a contributed page is exactly as present or absent as
 * a host destination on every surface at once (spec/navigation § plugin
 * destinations).
 *
 * Everything here is a plain accessor over the plugin registry signal and the
 * slot context — reactive where read inside a memo (ShellLayout's), and
 * re-derived from scratch when the registry changes, so a plugin that never
 * loads simply contributes nothing and one replaced in the dev loop swaps its
 * pages atomically. Derived objects (menu items, route components) are cached
 * against the FROZEN section/page declarations, so re-reads hand the menu and
 * the router the same object identities and nothing remounts
 * (kdd/solid-reactivity-pitfalls).
 */

/** A page's full store-relative path. */
const fullPagePath = (section: PluginPageSection, page: PluginPage): string =>
  `${section.path}/${page.path}`;

// activePageSections' cache, keyed on pageSections()' identity — the registry
// hands the same array back until a plugin registers, so the O(n²) collision
// resolution runs once per registry change rather than once per navigation,
// palette open and menu re-derive. The pageSections() read stays inside the
// accessor, so callers' memos still track the registry signal.
let activeInput: readonly RegisteredPageSection[] | undefined;
let activeResult: readonly RegisteredPageSection[] = [];

/**
 * The sections in force: the registry's deterministic order (plugin code, then
 * declaration order) with cross-plugin path collisions resolved by first claim
 * — so which section owns a path never depends on load timing. The losers are
 * named in diagnostics once, by `recordPageSectionCollisions` (PluginGate),
 * which derives them from THIS resolution, so there is one algorithm.
 */
export const activePageSections = (): readonly RegisteredPageSection[] => {
  const candidates = pageSections();
  if (candidates === activeInput) return activeResult;
  const active: RegisteredPageSection[] = [];
  for (const candidate of candidates) {
    const taken = active.some(kept =>
      pathsCollide(kept.section.path, candidate.section.path)
    );
    if (!taken) active.push(candidate);
  }
  activeInput = candidates;
  activeResult = active;
  return active;
};

// Deduped so a re-check (a dev-loop reload, a test's re-registration) cannot
// spam the same collision (the pattern of diagnostics.createRegionDiagnostics).
const reportedCollisions = new Set<string>();

/**
 * Record every section dropped by a cross-plugin path collision — called once
 * the loaded set is complete (the boot gate), because a collision is a fact
 * about the SET, not about either plugin alone.
 */
export const recordPageSectionCollisions = (): void => {
  // The losers are derived from the one resolution (activePageSections), never
  // re-computed: a second copy of the first-claim walk could drift and make
  // the diagnostics name a winner that actually lost.
  const kept = new Set(activePageSections());
  for (const candidate of pageSections()) {
    if (kept.has(candidate)) continue;
    const winner = activePageSections().find(active =>
      pathsCollide(active.section.path, candidate.section.path)
    );
    if (!winner) continue;
    const key = `${candidate.pluginCode}.${candidate.section.id}:${candidate.section.path}`;
    if (reportedCollisions.has(key)) continue;
    reportedCollisions.add(key);
    recordPluginDiagnostic({
      level: 'warning',
      pluginCode: candidate.pluginCode,
      message: `pages: section "${candidate.section.id}" path "${candidate.section.path}" collides with ${winner.pluginCode}'s "${winner.section.path}" — section skipped`,
    });
  }
};

/*
 * The two gate classes, exactly the registry's vocabulary (spec/navigation §
 * the gate vocabulary; navGates.ts):
 *
 *   when         capability-class — the store/session lacks the function, so
 *                the section is ABSENT everywhere and its routes redirect to
 *                the landing screen.
 *   permissions  permission-class — the function exists, this user lacks it,
 *                so the entries are absent and a page URL shows the
 *                no-permission notice in place of the screen (AC-PLUG-P1: the
 *                one condition behind both doors).
 */
// A gate that already threw, so its failure is recorded once — not per memo
// re-run: whenPasses is evaluated inside ShellLayout's menu and route memos,
// which re-run on every context change.
const reportedGateFailures = new Set<string>();

const whenPasses = (registered: RegisteredPageSection): boolean => {
  const { when } = registered.section;
  if (when === undefined) return true;
  // The gate is PLUGIN code running inside the shell's own memos (the menu,
  // the route verdict, the palette), so a throw here must not escape — it
  // would take down the whole shell, the exact opposite of rules § error
  // isolation. A throwing gate withholds the section, like a false, and is
  // named in diagnostics. Truthiness (not `=== true`): a JS-authored plugin's
  // `a && b` gate legitimately returns a non-boolean.
  try {
    return Boolean(when(slotContext()));
  } catch (error) {
    const key = `${registered.pluginCode}.${registered.section.id}`;
    if (!reportedGateFailures.has(key)) {
      reportedGateFailures.add(key);
      recordPluginDiagnostic({
        level: 'error',
        pluginCode: registered.pluginCode,
        message: `pages: section "${registered.section.id}" when gate threw (${String(error)}) — section withheld`,
      });
    }
    return false;
  }
};

const permissionsPass = (registered: RegisteredPageSection): boolean => {
  const required = registered.section.permissions;
  if (required === undefined || required.length === 0) return true;
  const held = slotContext().permissions;
  return required.every(permission => held.includes(permission));
};

/** The sections both gates offer — what the menu and the palette show. */
const offeredPageSections = (): readonly RegisteredPageSection[] =>
  activePageSections().filter(
    registered => whenPasses(registered) && permissionsPass(registered)
  );

// The ownership rule, once: a section owns its root and everything below it,
// on segment boundaries. The route verdict, the menu highlight and the
// breadcrumb glyph all resolve ownership through this one helper, so they can
// never disagree about whose a path is.
const owningSection = (
  relativePath: string
): RegisteredPageSection | undefined =>
  activePageSections().find(
    registered =>
      relativePath === registered.section.path ||
      relativePath.startsWith(`${registered.section.path}/`)
  );

/**
 * Route-guard verdict for a store-relative path that belongs to a plugin
 * section; undefined when no section claims it. The deepest destination rule
 * is prefix matching on the section, so a page's record-ish subpaths are
 * judged by their section's gates, exactly as a host child is judged by its
 * trail (navGates.routeAccess, which composes this in).
 */
export const pluginRouteAccess = (
  relativePath: string
): RouteAccess | undefined => {
  const owner = owningSection(relativePath);
  if (!owner) return undefined;
  if (!whenPasses(owner)) return { kind: 'blocked' };
  return permissionsPass(owner) ? { kind: 'ok' } : { kind: 'denied' };
};

// Menu items cached against the frozen section declaration: the gated array is
// fresh per read, but each ITEM keeps its identity, so MenuBar's <For> never
// remounts a section over an unrelated context change (the same stability
// contract gateNav documents).
const navItemCache = new WeakMap<PluginPageSection, NavItem>();

const toNavItem = (registered: RegisteredPageSection): NavItem => {
  const cached = navItemCache.get(registered.section);
  if (cached) return cached;
  const item: NavItem = {
    id: registered.section.path,
    labelKey: namespacedPluginKey(registered.pluginCode, registered.section.labelKey),
    to: registered.section.path,
    // One icon for every plugin section — no icon vocabulary crosses the SDK
    // boundary today; an SDK icon choice is an additive gap to file.
    icon: FileIcon,
    children: registered.section.pages.map(page => ({
      id: fullPagePath(registered.section, page),
      labelKey: namespacedPluginKey(registered.pluginCode, page.labelKey),
      to: fullPagePath(registered.section, page),
    })),
  };
  navItemCache.set(registered.section, item);
  return item;
};

/**
 * The plugin sections the gates offer right now, as menu items — appended
 * after the host's own upper sections (ShellLayout). Call inside a memo.
 */
export const pluginNavItems = (): NavItem[] =>
  offeredPageSections().map(toNavItem);

/**
 * Every plugin page as a palette destination, UNGATED — rows are registered
 * once per shell mount and each row's `disabled` re-reads the gates
 * (navActions), the same registration/gating split host destinations use. A
 * section is not a destination: its landing renders nothing of its own, so
 * only pages get rows (the palette's own section rule).
 */
export const pluginPaletteDestinations = (): {
  path: string;
  labelKey: LocaleKey;
}[] =>
  activePageSections().flatMap(registered =>
    registered.section.pages.map(page => ({
      path: fullPagePath(registered.section, page),
      labelKey: namespacedPluginKey(registered.pluginCode, page.labelKey),
    }))
  );

/** The plugin page paths the gates offer right now (palette `disabled`). */
export const pluginOfferedPaths = (): string[] =>
  offeredPageSections().flatMap(registered =>
    registered.section.pages.map(page => fullPagePath(registered.section, page))
  );

/**
 * The menu entry a plugin-owned route belongs to — its page's own, or the page
 * it sits beneath (record screens keep their list's entry highlighted), via
 * the SAME matching rule the host half uses (navModel.matchLeaf). Undefined
 * for a section-owned path no page claims (the section root, an unclaimed
 * subpath): those render the not-found page, which highlights nothing —
 * exactly as an unknown host path does.
 */
export const pluginLeafByPath = (relativePath: string): NavLeaf | undefined => {
  const owner = owningSection(relativePath);
  if (!owner) return undefined;
  return matchLeaf(toNavItem(owner).children ?? [], relativePath);
};

/** The key naming a plugin-owned screen (tab title — documentTitle). */
export const pluginScreenLabelKey = (
  relativePath: string
): LocaleKey | undefined => pluginLeafByPath(relativePath)?.labelKey;

/**
 * The section glyph for a plugin-owned path (breadcrumb leading icon) — the
 * plugin-side half of navModel.sectionIconForPath. Resolved through the same
 * leaf match as the highlight and the tab title, so a path that renders the
 * not-found page (a section root, an unclaimed subpath) gets no glyph — a
 * glyph over "no destination" would claim an entry the menu does not show.
 */
export const pluginSectionIconForPath = (
  relativePath: string
): Component<IconProps> | undefined =>
  pluginLeafByPath(relativePath) ? FileIcon : undefined;

// One lazy component per page declaration, for the page's whole life: a fresh
// lazy() per render would refetch and remount the body on every navigation
// back to the page.
const pageComponentCache = new WeakMap<PluginPage, Component>();

const pageComponent = (
  registered: RegisteredPageSection,
  page: PluginPage
): Component => {
  const cached = pageComponentCache.get(page);
  if (cached) return cached;
  // The lazy() call is what defers the plugin's page code to first navigation
  // (AC-PLUG-P2): `load` is not invoked here, only when the route first
  // renders, behind the Suspense boundary below (sdk-contract § code
  // splitting). A rejected load evicts the cache entry: lazy() memoises the
  // import promise, so without the eviction one transient network failure
  // would leave the page on its fallback for the whole session — the NEXT
  // navigation builds a fresh component and retries instead.
  const Body = lazy(() =>
    page.load().catch((error: unknown) => {
      pageComponentCache.delete(page);
      throw error;
    })
  );
  const labelKey = namespacedPluginKey(registered.pluginCode, page.labelKey);
  const Screen: Component = () => (
    // The host frame (spec/plugins/ui-surface.md § S2): app frame and page
    // frame are the host's — the Page geometry and the header put the
    // hamburger (and so the menu) in reach at narrow widths, exactly as
    // EntryPage argues — and the single crumb is the page's translated title
    // (the nav group is never a crumb). The plugin owns only the body.
    <Page
      header={
        <Header>
          <Breadcrumb crumbs={[{ label: t(labelKey) }]} />
        </Header>
      }
    >
      {/* A throwing page is contained to its body — the frame, the menu and
          every other surface keep working (rules § error isolation), behind
          the same fallback text every slot region shows. */}
      <ErrorBoundary fallback={<p>{t('error.plugin-unavailable')}</p>}>
        <Suspense>
          <Body />
        </Suspense>
      </ErrorBoundary>
    </Page>
  );
  pageComponentCache.set(page, Screen);
  return Screen;
};

/**
 * One route per plugin page, ready for the router (App.tsx). UNGATED, like the
 * host's own generated routes: the gate is ShellLayout's reactive routeAccess
 * verdict, which blocks or denies BEFORE the route's component renders, so
 * registering a route is not offering it (AC-PLUG-P1's second door).
 */
export const pluginPageRoutes = (): {
  path: string;
  Component: Component;
}[] =>
  activePageSections().flatMap(registered =>
    registered.section.pages.map(page => ({
      path: fullPagePath(registered.section, page),
      Component: pageComponent(registered, page),
    }))
  );
