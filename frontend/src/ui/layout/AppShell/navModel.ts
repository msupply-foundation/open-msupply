import type { Component } from 'solid-js';
import type { IconProps } from '../../icons';
import {
  HomeIcon,
  TruckIcon,
  StockIcon,
  CustomersIcon,
  ThermometerIcon,
  FileIcon,
  CatalogueIcon,
  SlidersIcon,
  ReportsIcon,
  SettingsIcon,
  HelpIcon,
  ReplenishmentIcon,
} from '../../icons';
import type { LocaleKey } from '../../../intl';
import {
  navConfig,
  type NavCapability,
  type NavItem as NavConfigItem,
} from '../../../nav/navConfig';

/*
 * The menu-bar nav model. The destination tree + paths + label keys are the
 * single source of truth in src/nav/navConfig.ts (the router generates a route
 * per destination from the same file); this layer adds the presentation the
 * MenuBar needs — a section icon and the upper/lower grouping. Labels stay i18n
 * KEYS here (LocaleKey); the MenuBar resolves them with t() at render, so the
 * menu re-translates on a language switch. `to` is store-relative (e.g.
 * 'inventory/stocktakes'); the routed shell prefixes the active store id.
 */

export interface NavLeaf {
  id: string;
  labelKey: LocaleKey;
  to: string;
  /** Capability gate (see navConfig NavItem.gate). */
  gate?: NavCapability;
  /** Permission-gated read — withheld without it (navConfig). */
  permission?: NavConfigItem['permission'];
}

export interface NavItem {
  id: string;
  labelKey: LocaleKey;
  to: string;
  icon: Component<IconProps>;
  /** Capability gate (see navConfig NavItem.gate). */
  gate?: NavCapability;
  /** Permission-gated read — withheld without it (navConfig). */
  permission?: NavConfigItem['permission'];
  /** Present → expandable parent section. Absent → a leaf link. */
  children?: NavLeaf[];
}

// Section icons, keyed by the top-level navConfig path. Cosmetic; one icon set
// only.
const SECTION_ICONS: Record<string, Component<IconProps>> = {
  // Home's key is '' — the store root's own store-relative path (navConfig).
  '': HomeIcon,
  replenishment: ReplenishmentIcon,
  inventory: StockIcon,
  distribution: TruckIcon,
  dispensary: CustomersIcon,
  'cold-chain': ThermometerIcon,
  programs: FileIcon,
  catalogue: CatalogueIcon,
  manage: SlidersIcon,
  reports: ReportsIcon,
  settings: SettingsIcon,
  help: HelpIcon,
};

/**
 * The section glyph for a store-relative path ('inventory/stocktakes',
 * 'distribution/customer-requisition/{id}', '' for the store root) — the
 * leading icon every page's breadcrumb shows (spec/ui-standards › layout, page
 * regions: the nav group is never a crumb, its glyph takes the trail's
 * leading-icon slot instead). Keyed by the FIRST path segment, so a section's
 * children and their record screens all resolve to their group's icon.
 */
export const sectionIconForPath = (
  relativePath: string
): Component<IconProps> | undefined =>
  SECTION_ICONS[relativePath.split('/')[0] ?? ''];

// Sections pinned to the block-end lower cluster (matching the current app);
// everything else scrolls in the upper list. Reports stays in the upper list,
// as its last entry (spec/chrome § sidebar order: … Dispensary · Reports ·
// Catalogue).
const LOWER_IDS = new Set(['catalogue', 'manage', 'settings', 'help']);

const toNavItem = (item: NavConfigItem): NavItem => ({
  // `id` names the entry (menu highlight, `nav-<id>` testid); `to` routes it.
  // They are the same string for every destination except Home, whose route is
  // the store root — an empty `to`, which would leave it a nameless `nav-`.
  id: item.path || 'home',
  labelKey: item.labelKey,
  to: item.path,
  icon: SECTION_ICONS[item.path] ?? FileIcon,
  gate: item.gate,
  permission: item.permission,
  children: item.children?.map(child => ({
    id: child.path,
    labelKey: child.labelKey,
    to: child.path,
    gate: child.gate,
    permission: child.permission,
  })),
});

/**
 * The menu model for a registry — the upper/lower clusters and the flat leaf
 * list, in one pass.
 *
 * Takes the registry rather than reading `navConfig`, because which registry is
 * in force is a runtime fact: a prescriber-mode user navigates from
 * `prescriberNavConfig` instead (spec/prescription-requests § prescriber mode).
 * The choice itself is not made here — this layer stays presentation-only, and
 * `src/nav/navGates` owns `activeNavConfig`; this file would otherwise need the
 * store context, deepening a library→app import the showcase harness KDD
 * already records as a boundary exception to consolidate.
 *
 * Sync is NOT a menu entry (issue #9229): it never navigated anywhere, and its
 * status now lives in the bottom bar's sync cell (spec/chrome § sync status),
 * where one click starts a run and a second control opens the modal.
 */
export const buildNavModel = (
  config: NavConfigItem[]
): { upper: NavItem[]; lower: NavItem[]; leaves: NavLeaf[] } => {
  const items = config.map(toNavItem);
  return {
    upper: items.filter(item => !LOWER_IDS.has(item.id)),
    lower: items.filter(item => LOWER_IDS.has(item.id)),
    // Every selectable destination as a flat NavLeaf list (top-level leaves +
    // all children) — used to derive the menu highlight from the current route.
    leaves: items.flatMap(item =>
      item.children
        ? item.children
        : [
            {
              id: item.id,
              labelKey: item.labelKey,
              to: item.to,
              gate: item.gate,
              permission: item.permission,
            },
          ]
    ),
  };
};

// The FULL registry's model. AppShell falls back to these when a host supplies
// no menu (the showcase); the app itself passes the model for the registry in
// force, which is not always this one.
const fullNav = buildNavModel(navConfig);

export const upperNav: NavItem[] = fullNav.upper;
export const lowerNav: NavItem[] = fullNav.lower;
export const navLeaves: NavLeaf[] = fullNav.leaves;

/**
 * The menu entry a route belongs to — its own, or the one it sits beneath.
 *
 * A record screen has no menu entry of its own: `inventory/stocktakes/{id}` is
 * reached from Stocktakes and its breadcrumb trail starts there
 * (ui-standards/layout § app bar), so the menu must keep showing Stocktakes.
 * Matching the path exactly left every detail screen in the app with nothing
 * highlighted at all — no entry, and no section either.
 *
 * The `/` in the prefix test keeps it on segment boundaries (`inventory/stock`
 * must not claim `inventory/stocktakes/1`), and the longest match wins so a
 * deeper entry beats the shallower one it nests under.
 */
export const findLeafIn = (
  leaves: NavLeaf[],
  relativePath: string
): NavLeaf | undefined =>
  leaves.find(leaf => leaf.to === relativePath) ??
  leaves
    .filter(leaf => relativePath.startsWith(`${leaf.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];

/** As `findLeafIn`, over the full registry's leaves. */
export const findLeafByPath = (relativePath: string): NavLeaf | undefined =>
  findLeafIn(navLeaves, relativePath);
