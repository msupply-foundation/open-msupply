import type { Component } from 'solid-js';
import type { IconProps } from '../../icons';
import {
  DashboardIcon,
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
  SyncIcon,
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
  /** Permission-gated read — visible, refused on activation (navConfig). */
  permission?: NavConfigItem['permission'];
}

// A small status marker on a nav entry (the sync indicator). A count rides a
// Badge pill (meaning in the label text; tone only escalates it); an alert is
// the current app's bare error-coloured alert glyph (spec/chrome § sync
// indicator).
export type NavBadge =
  | {
      kind: 'count';
      label: string;
      tone: 'neutral' | 'warning' | 'error';
      title?: string;
    }
  | { kind: 'alert'; title: string };

export interface NavItem {
  id: string;
  labelKey: LocaleKey;
  to: string;
  icon: Component<IconProps>;
  /** Capability gate (see navConfig NavItem.gate). */
  gate?: NavCapability;
  /** Permission-gated read — visible, refused on activation (navConfig). */
  permission?: NavConfigItem['permission'];
  /** Present → expandable parent section. Absent → a leaf link. */
  children?: NavLeaf[];
}

// Section icons, keyed by the top-level navConfig path. Cosmetic; one icon set
// only.
const SECTION_ICONS: Record<string, Component<IconProps>> = {
  dashboard: DashboardIcon,
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
  id: item.path,
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

const items = navConfig.map(toNavItem);

// The Sync entry is chrome, not a destination (spec/chrome § sync indicator):
// it opens the sync modal in place, so it lives here — NOT in navConfig, which
// would generate a route for it. Pinned between Settings and Help per the
// chrome frame layout.
export const SYNC_NAV_ID = 'sync';
const syncNavItem: NavItem = {
  id: SYNC_NAV_ID,
  labelKey: 'sync',
  to: 'sync',
  icon: SyncIcon,
};

export const upperNav: NavItem[] = items.filter(
  item => !LOWER_IDS.has(item.id)
);
const lower = items.filter(item => LOWER_IDS.has(item.id));
lower.splice(
  lower.findIndex(item => item.id === 'help'),
  0,
  syncNavItem
);
export const lowerNav: NavItem[] = lower;

// Every selectable destination as a flat NavLeaf list (top-level leaves + all
// children) — used to derive the menu highlight from the current route.
export const navLeaves: NavLeaf[] = items.flatMap(item =>
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
);

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
export const findLeafByPath = (relativePath: string): NavLeaf | undefined =>
  navLeaves.find(leaf => leaf.to === relativePath) ??
  navLeaves
    .filter(leaf => relativePath.startsWith(`${leaf.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];
