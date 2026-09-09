import { ErrorBoundary, lazy, Suspense } from 'solid-js';
import type { Component } from 'solid-js';
import { t, type LocaleKey } from '../intl';
import { FileIcon, type IconProps } from '../ui/icons';
import { Page } from '../ui/layout/Page/Page';
import { Header } from '../ui/layout/Header/Header';
import { Breadcrumb } from '../ui/layout/Header/Breadcrumb';
import { upperNav, type NavItem, type NavLeaf } from '../ui/layout/AppShell/navModel';
import { anchorMerge, type AnchorDiagnostic } from './anchorMerge';
import type { RouteAccess } from '../nav/navGates';
import { namespacedPluginKey } from '../plugin-sdk/intl';
import type { PluginNavSection, PluginPage } from '../plugin-sdk/types';
import {
  registeredNavSections,
  registeredPages,
  type RegisteredNavSection,
  type RegisteredPage,
} from './registry';
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
 * Pages are FLAT: each carries its own full path, its own gates, and its own
 * (optional) menu placement. A menu group is a menu object, not a page — the
 * plugin declares it under `navSections` and pages place themselves into it
 * (`nav: { in }`), into a host section, at the root of the upper list
 * (`nav: { root: true }`), or nowhere (routed, no menu entry).
 *
 * Everything here is a plain accessor over the plugin registry signal and the
 * slot context — reactive where read inside a memo (ShellLayout's), and
 * re-derived from scratch when the registry changes, so a plugin that never
 * loads simply contributes nothing and one replaced in the dev loop swaps its
 * pages atomically. Derived objects (menu items, route components) are cached
 * against the FROZEN page/section declarations, so re-reads hand the menu and
 * the router the same object identities and nothing remounts
 * (kdd/solid-reactivity-pitfalls).
 */

// activePages' cache, keyed on registeredPages()' identity — the registry
// hands the same array back until a plugin registers, so the O(n²) collision
// resolution runs once per registry change rather than once per navigation,
// palette open and menu re-derive. The registeredPages() read stays inside the
// accessor, so callers' memos still track the registry signal.
let activeInput: readonly RegisteredPage[] | undefined;
let activeResult: readonly RegisteredPage[] = [];

/**
 * The pages in force: the registry's deterministic order (plugin code, then
 * declaration order) with cross-plugin path collisions resolved by first claim
 * — so which page owns a path never depends on load timing. The losers are
 * named in diagnostics once, by `recordPagePathCollisions` (PluginGate), which
 * derives them from THIS resolution, so there is one algorithm. Intra-plugin
 * collisions never reach here — validation refuses them with the bundle.
 */
export const activePages = (): readonly RegisteredPage[] => {
  const candidates = registeredPages();
  if (candidates === activeInput) return activeResult;
  const active: RegisteredPage[] = [];
  for (const candidate of candidates) {
    const taken = active.some(kept =>
      pathsCollide(kept.page.path, candidate.page.path)
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
 * Record every page dropped by a cross-plugin path collision — called once the
 * loaded set is complete (the boot gate), because a collision is a fact about
 * the SET, not about either plugin alone.
 */
export const recordPagePathCollisions = (): void => {
  // The losers are derived from the one resolution (activePages), never
  // re-computed: a second copy of the first-claim walk could drift and make
  // the diagnostics name a winner that actually lost.
  const kept = new Set(activePages());
  for (const candidate of registeredPages()) {
    if (kept.has(candidate)) continue;
    const winner = activePages().find(active =>
      pathsCollide(active.page.path, candidate.page.path)
    );
    if (!winner) continue;
    const key = `${candidate.pluginCode}.${candidate.page.id}:${candidate.page.path}`;
    if (reportedCollisions.has(key)) continue;
    reportedCollisions.add(key);
    recordPluginDiagnostic({
      level: 'warning',
      pluginCode: candidate.pluginCode,
      message: `pages: page "${candidate.page.id}" path "${candidate.page.path}" collides with ${winner.pluginCode}'s "${winner.page.path}" — page skipped`,
    });
  }
};

/*
 * The two gate classes, exactly the registry's vocabulary (spec/navigation §
 * the gate vocabulary; navGates.ts):
 *
 *   when         capability-class — the store/session lacks the function, so
 *                the page is ABSENT everywhere and its routes redirect to the
 *                landing screen.
 *   permissions  permission-class — the function exists, this user lacks it,
 *                so the entries are absent and a page URL shows the
 *                no-permission notice in place of the screen (AC-PLUG-P1: the
 *                one condition behind both doors).
 *
 * A page placed in one of its plugin's own nav sections composes the section's
 * gates with its own (sdk-contract § gating): the group gate is a gate on
 * every page in the group, on every surface at once.
 */
// A gate that already threw, so its failure is recorded once — not per memo
// re-run: gates are evaluated inside ShellLayout's menu and route memos, which
// re-run on every context change.
const reportedGateFailures = new Set<string>();

const whenPasses = (
  pluginCode: string,
  entity: string,
  when: ((ctx: ReturnType<typeof slotContext>) => boolean) | undefined
): boolean => {
  if (when === undefined) return true;
  // The gate is PLUGIN code running inside the shell's own memos (the menu,
  // the route verdict, the palette), so a throw here must not escape — it
  // would take down the whole shell, the exact opposite of rules § error
  // isolation. A throwing gate withholds the page, like a false, and is named
  // in diagnostics. Truthiness (not `=== true`): a JS-authored plugin's
  // `a && b` gate legitimately returns a non-boolean.
  try {
    return Boolean(when(slotContext()));
  } catch (error) {
    const key = `${pluginCode}.${entity}`;
    if (!reportedGateFailures.has(key)) {
      reportedGateFailures.add(key);
      recordPluginDiagnostic({
        level: 'error',
        pluginCode,
        message: `pages: ${entity} when gate threw (${String(error)}) — withheld`,
      });
    }
    return false;
  }
};

const permissionsPass = (required: readonly string[] | undefined): boolean => {
  if (required === undefined || required.length === 0) return true;
  const held = slotContext().permissions;
  return required.every(permission => held.includes(permission));
};

/**
 * The plugin's own nav section a page is placed in — undefined for a host
 * placement, a root placement, or no placement. `nav.in` ids are unambiguous:
 * validation refuses a plugin section id that shadows a host section id.
 */
const navSectionFor = (
  registered: RegisteredPage
): RegisteredNavSection | undefined => {
  const nav = registered.page.nav;
  if (!nav || !('in' in nav) || nav.in === undefined) return undefined;
  return registeredNavSections().find(
    candidate =>
      candidate.pluginCode === registered.pluginCode &&
      candidate.section.id === nav.in
  );
};

/**
 * The one access verdict for a page, both gate levels composed. Capability is
 * judged first, at either level: a function the store does not have redirects
 * (blocked) even when the user would also lack its read — exactly the host
 * gates' own precedence (navGates.routeAccess).
 */
const pageAccess = (registered: RegisteredPage): RouteAccess => {
  const { pluginCode, page } = registered;
  const section = navSectionFor(registered);
  const pageWhen = whenPasses(pluginCode, `page "${page.id}"`, page.when);
  const sectionWhen =
    section === undefined ||
    whenPasses(
      pluginCode,
      `nav section "${section.section.id}"`,
      section.section.when
    );
  if (!pageWhen || !sectionWhen) return { kind: 'blocked' };
  const permitted =
    permissionsPass(page.permissions) &&
    permissionsPass(section?.section.permissions);
  return permitted ? { kind: 'ok' } : { kind: 'denied' };
};

/** The pages both gates offer — what the menu and the palette show. */
const offeredPages = (): readonly RegisteredPage[] =>
  activePages().filter(registered => pageAccess(registered).kind === 'ok');

// The ownership rule, once: a page owns its path and everything below it, on
// segment boundaries. The route verdict, the menu highlight and the breadcrumb
// glyph all resolve ownership through this one helper, so they can never
// disagree about whose a path is. Active paths never overlap (validation
// intra-plugin, first-claim cross-plugin), so the owner is unique.
const owningPage = (relativePath: string): RegisteredPage | undefined =>
  activePages().find(
    registered =>
      relativePath === registered.page.path ||
      relativePath.startsWith(`${registered.page.path}/`)
  );

/**
 * Route-guard verdict for a store-relative path that belongs to a plugin page;
 * undefined when no page claims it. The deepest destination rule is prefix
 * matching on the page, so a page's record-ish subpaths are judged by the
 * page's (and its group's) gates, exactly as a host child is judged by its
 * trail (navGates.routeAccess, which composes this in).
 */
export const pluginRouteAccess = (
  relativePath: string
): RouteAccess | undefined => {
  const owner = owningPage(relativePath);
  if (!owner) return undefined;
  return pageAccess(owner);
};

// Menu leaves cached against the frozen page declaration: a page's leaf is
// static (id, label, path all come from the declaration), so every surface —
// the menu, the highlight, the breadcrumb — sees one object per page for the
// registry's whole life.
const navLeafCache = new WeakMap<PluginPage, NavLeaf>();

const toNavLeaf = (registered: RegisteredPage): NavLeaf => {
  const cached = navLeafCache.get(registered.page);
  if (cached) return cached;
  const leaf: NavLeaf = {
    // id = the store-relative path, the host's own convention for menu ids —
    // what the highlight matches against.
    id: registered.page.path,
    labelKey: namespacedPluginKey(
      registered.pluginCode,
      registered.page.labelKey
    ),
    to: registered.page.path,
  };
  navLeafCache.set(registered.page, leaf);
  return leaf;
};

// A root-placed page's top-level menu item — cacheable outright, like a leaf.
const rootItemCache = new WeakMap<PluginPage, NavItem>();

const toRootItem = (registered: RegisteredPage): NavItem => {
  const cached = rootItemCache.get(registered.page);
  if (cached) return cached;
  const item: NavItem = {
    id: registered.page.path,
    labelKey: namespacedPluginKey(
      registered.pluginCode,
      registered.page.labelKey
    ),
    to: registered.page.path,
    // One icon for every plugin entry — no icon vocabulary crosses the SDK
    // boundary today; an SDK icon choice is an additive gap to file.
    icon: FileIcon,
  };
  rootItemCache.set(registered.page, item);
  return item;
};

// A plugin section's menu item: its CHILDREN vary with each placed page's own
// gates, so the cache re-keys on the offered-children set and rebuilds only
// when that set actually changes — unrelated context changes hand MenuBar the
// same object and nothing remounts (the stability contract gateNav documents).
const groupItemCache = new WeakMap<
  PluginNavSection,
  { key: string; item: NavItem }
>();

const toGroupItem = (
  registered: RegisteredNavSection,
  children: NavLeaf[]
): NavItem => {
  const key = children.map(child => child.id).join('\n');
  const cached = groupItemCache.get(registered.section);
  if (cached && cached.key === key) return cached.item;
  const item: NavItem = {
    id: `${registered.pluginCode}.${registered.section.id}`,
    labelKey: namespacedPluginKey(
      registered.pluginCode,
      registered.section.labelKey
    ),
    // A group is a toggle, not a destination (MenuBar renders a children-
    // carrying item as an expandable section and never navigates its `to`);
    // the first entry's path keeps the field honest.
    to: children[0]?.to ?? '',
    icon: FileIcon,
    children,
  };
  groupItemCache.set(registered.section, { key, item });
  return item;
};

/** The offered pages placed in one plugin nav section, declaration order. */
const pagesInOwnSection = (
  registered: RegisteredNavSection
): readonly RegisteredPage[] =>
  offeredPages().filter(
    candidate =>
      candidate.pluginCode === registered.pluginCode &&
      candidate.page.nav !== undefined &&
      'in' in candidate.page.nav &&
      candidate.page.nav.in === registered.section.id
  );

/** The offered pages placed in one HOST section, active order. */
const pagesInHostSection = (hostId: string): readonly RegisteredPage[] =>
  offeredPages().filter(
    candidate =>
      candidate.page.nav !== undefined &&
      'in' in candidate.page.nav &&
      candidate.page.nav.in === hostId &&
      // The plugin's own section wins the id where both could match — but
      // validation refuses shadowing ids, so this is belt and braces.
      navSectionFor(candidate) === undefined
  );

/**
 * The plugin entries of the menu's UPPER LIST the gates offer right now — the
 * plugin's own sections (each holding its placed pages; a group with nothing
 * offered in it does not render) and the root-placed pages, in registry order.
 * The anchor-free view (tests, and any surface that only needs the set); the
 * menu itself goes through `mergeUpperNav`, which places each entry by its
 * declared anchor. Pages placed IN a host section are not top-level entries —
 * `mergeUpperNav` folds them into their section's children.
 */
export const pluginNavItems = (): NavItem[] => [
  ...registeredNavSections().flatMap(registered => {
    const children = pagesInOwnSection(registered).map(toNavLeaf);
    return children.length > 0 ? [toGroupItem(registered, [...children])] : [];
  }),
  ...offeredPages()
    .filter(
      registered =>
        registered.page.nav !== undefined && 'root' in registered.page.nav
    )
    .map(toRootItem),
];

// Host items with plugin pages folded into their children keep their identity
// until either the gated host item or the folded-in set changes — so an
// unrelated context change hands MenuBar the same section object (the same
// contract as the group cache above).
const injectedHostCache = new Map<
  string,
  { source: NavItem; key: string; item: NavItem }
>();

/**
 * The menu's upper list: the gated host sections — each with any offered
 * plugin pages placed inside it folded into its children by their anchors —
 * merged with the plugin's own sections and root-placed pages, each placed by
 * its declared anchor (sdk-contract § the page contribution) — the same
 * anchored merge every contributing surface uses (anchorMerge).
 *
 * `gated` is the host list AFTER gateNav, so a section the store's gates hide
 * is a published id with no rendered position: anchoring to it degrades to the
 * end (a page placed IN it is withheld with it — its container is not
 * rendered), reported in `diagnostics` — which the caller records
 * (createRegionDiagnostics), because this runs inside the menu memo and
 * recording is a write. `order` is the entry's index in the deterministic
 * registry order, so entries sharing a coordinate keep the "plugin code, then
 * declaration order" rule the registry guarantees. Item identities come from
 * the per-declaration caches, so the merge hands MenuBar the same objects
 * every read and nothing remounts.
 */
export const mergeUpperNav = (
  gated: readonly NavItem[]
): { items: NavItem[]; diagnostics: AnchorDiagnostic[] } => {
  const diagnostics: AnchorDiagnostic[] = [];

  // Pages placed IN a host section fold into that section's children first,
  // anchored against the section's own entry ids (an entry's id is its path).
  const withInjections = (host: NavItem): NavItem => {
    const placed = pagesInHostSection(host.id);
    if (placed.length === 0) return host;
    const hostChildren = host.children ?? [];
    const merge = anchorMerge(
      hostChildren.map(child => ({ id: child.id })),
      placed.map(registered => ({
        id: `${registered.pluginCode}.${registered.page.id}`,
        anchor:
          registered.page.nav && 'anchor' in registered.page.nav
            ? registered.page.nav.anchor
            : undefined,
        order: activePages().indexOf(registered),
        item: toNavLeaf(registered),
      }))
    );
    diagnostics.push(...merge.diagnostics);
    const childById = new Map(hostChildren.map(child => [child.id, child]));
    const children = merge.entries.flatMap(entry => {
      const child =
        entry.kind === 'host' ? childById.get(entry.item.id) : entry.item.item;
      return child ? [child] : [];
    });
    const key = children.map(child => child.id).join('\n');
    const cached = injectedHostCache.get(host.id);
    if (cached && cached.source === host && cached.key === key) {
      return cached.item;
    }
    const item: NavItem = { ...host, children };
    injectedHostCache.set(host.id, { source: host, key, item });
    return item;
  };

  const rendered = new Map(gated.map(item => [item.id, withInjections(item)]));
  const hosts = upperNav.map(section => ({
    id: section.id,
    hidden: !rendered.has(section.id),
  }));

  // The upper-list contributions in ONE deterministic order — the plugin's own
  // sections (registry order), then the root-placed pages (active order) — so
  // entries sharing a coordinate never depend on load timing.
  const contributions = [
    ...registeredNavSections().flatMap(registered => {
      const children = pagesInOwnSection(registered).map(toNavLeaf);
      if (children.length === 0) return [];
      return [
        {
          id: `${registered.pluginCode}.${registered.section.id}`,
          anchor: registered.section.anchor,
          item: toGroupItem(registered, [...children]),
        },
      ];
    }),
    ...offeredPages()
      .filter(
        registered =>
          registered.page.nav !== undefined && 'root' in registered.page.nav
      )
      .map(registered => ({
        id: `${registered.pluginCode}.${registered.page.id}`,
        anchor: registered.page.nav?.anchor,
        item: toRootItem(registered),
      })),
  ].map((contribution, index) => ({ ...contribution, order: index }));

  const merge = anchorMerge(hosts, contributions);
  diagnostics.push(...merge.diagnostics);
  return {
    // A host entry resolves through `rendered` (always present — the merge
    // drops hidden hosts); the flatMap shape just keeps that fact out of the
    // type system instead of asserting it.
    items: merge.entries.flatMap(entry => {
      const item =
        entry.kind === 'host' ? rendered.get(entry.item.id) : entry.item.item;
      return item ? [item] : [];
    }),
    diagnostics,
  };
};

/**
 * Every menu-placed plugin page as a palette destination, UNGATED — rows are
 * registered once per shell mount and each row's `disabled` re-reads the gates
 * (navActions), the same registration/gating split host destinations use. A
 * page with no `nav` gets no row — like a host record screen, it is reached
 * from the plugin's own UI, not browsed to; a group is not a destination
 * either, so only placed pages get rows (the palette's own section rule).
 */
export const pluginPaletteDestinations = (): {
  path: string;
  labelKey: LocaleKey;
}[] =>
  activePages()
    .filter(registered => registered.page.nav !== undefined)
    .map(registered => ({
      path: registered.page.path,
      labelKey: namespacedPluginKey(
        registered.pluginCode,
        registered.page.labelKey
      ),
    }));

/** The plugin page paths the gates offer right now (palette `disabled`). */
export const pluginOfferedPaths = (): string[] =>
  offeredPages()
    .filter(registered => registered.page.nav !== undefined)
    .map(registered => registered.page.path);

/**
 * The menu entry a plugin-owned route belongs to — its page's own, or the page
 * it sits beneath (record screens keep their list's entry highlighted), via
 * the SAME ownership rule every other surface uses (owningPage). A page with
 * no menu placement still gets its leaf: the tab title and breadcrumb name the
 * screen either way, and its id matches no menu entry, so nothing highlights —
 * exactly a host record screen's behaviour.
 */
export const pluginLeafByPath = (relativePath: string): NavLeaf | undefined => {
  const owner = owningPage(relativePath);
  return owner ? toNavLeaf(owner) : undefined;
};

/** The key naming a plugin-owned screen (tab title — documentTitle). */
export const pluginScreenLabelKey = (
  relativePath: string
): LocaleKey | undefined => pluginLeafByPath(relativePath)?.labelKey;

/**
 * The section glyph for a plugin-owned path (breadcrumb leading icon) — the
 * plugin-side half of navModel.sectionIconForPath. Resolved through the same
 * ownership rule as the highlight and the tab title, so a path no page owns
 * (an unclaimed subpath) gets no glyph — a glyph over "no destination" would
 * claim an entry the menu does not show.
 */
export const pluginSectionIconForPath = (
  relativePath: string
): Component<IconProps> | undefined =>
  pluginLeafByPath(relativePath) ? FileIcon : undefined;

// One lazy component per page declaration, for the page's whole life: a fresh
// lazy() per render would refetch and remount the body on every navigation
// back to the page.
const pageComponentCache = new WeakMap<PluginPage, Component>();

const pageComponent = (registered: RegisteredPage): Component => {
  const { page } = registered;
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
  activePages().map(registered => ({
    path: registered.page.path,
    Component: pageComponent(registered),
  }));
