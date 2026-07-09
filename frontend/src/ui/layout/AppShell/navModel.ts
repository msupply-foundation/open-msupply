import type { Component } from 'solid-js'
import type { IconProps } from '../../icons'
import {
  HomeIcon,
  TruckIcon,
  StockIcon,
  CustomersIcon,
  ThermometerIcon,
  FileIcon,
  ListIcon,
  SlidersIcon,
  ReportsIcon,
  SettingsIcon,
  HelpIcon,
  DownloadIcon,
} from '../../icons'
import type { LocaleKey } from '../../../intl'
import { navConfig, type NavItem as NavConfigItem } from '../../../nav/navConfig'

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
  id: string
  labelKey: LocaleKey
  to: string
}

export interface NavItem {
  id: string
  labelKey: LocaleKey
  to: string
  icon: Component<IconProps>
  /** Present → expandable parent section. Absent → a leaf link. */
  children?: NavLeaf[]
}

// Section icons, keyed by the top-level navConfig path. Cosmetic; one icon set
// only (spec DIVERGENCES D4).
const SECTION_ICONS: Record<string, Component<IconProps>> = {
  dashboard: HomeIcon,
  replenishment: DownloadIcon,
  inventory: StockIcon,
  distribution: TruckIcon,
  dispensary: CustomersIcon,
  'cold-chain': ThermometerIcon,
  programs: FileIcon,
  catalogue: ListIcon,
  manage: SlidersIcon,
  reports: ReportsIcon,
  settings: SettingsIcon,
  help: HelpIcon,
}

// Sections pinned to the block-end lower cluster (matching the current app);
// everything else scrolls in the upper list.
const LOWER_IDS = new Set(['catalogue', 'manage', 'reports', 'settings', 'help'])

const toNavItem = (item: NavConfigItem): NavItem => ({
  id: item.path,
  labelKey: item.labelKey,
  to: item.path,
  icon: SECTION_ICONS[item.path] ?? FileIcon,
  children: item.children?.map((child) => ({
    id: child.path,
    labelKey: child.labelKey,
    to: child.path,
  })),
})

const items = navConfig.map(toNavItem)

export const upperNav: NavItem[] = items.filter((item) => !LOWER_IDS.has(item.id))
export const lowerNav: NavItem[] = items.filter((item) => LOWER_IDS.has(item.id))

// Every selectable destination as a flat NavLeaf list (top-level leaves + all
// children) — used to derive the menu highlight from the current route.
export const navLeaves: NavLeaf[] = items.flatMap((item) =>
  item.children ? item.children : [{ id: item.id, labelKey: item.labelKey, to: item.to }],
)

export const findLeafByPath = (relativePath: string): NavLeaf | undefined =>
  navLeaves.find((leaf) => leaf.to === relativePath)
