// The navigation tree, mirroring the reference host app (Site.tsx + the section
// Nav components). One source of truth: the left menu renders from it, the
// router generates a route per destination from it, and the command palette
// lists the destinations carrying a `cmdkKey`.
//
// Paths are relative to the store root (/{storeId}). A section's own `path` is
// a landing destination; its `children` are the inner sub-menu entries.
//
// Labels are i18n keys, not English (kdd/type-safety: LocaleKey is derived from
// the catalog, so a typo or an un-added key stops compiling). Every renderer
// that shows a destination — MenuBar, Breadcrumb, EntryPage title, the command
// palette — resolves the key with t() at render time, so every surface
// re-translates on a language switch.

import type { LocaleKey } from '../intl';

export type NavItem = {
  labelKey: LocaleKey;
  path: string;
  children?: NavItem[];
  /**
   * Central-server-only destination: shown in the menu — and its route reached —
   * only on a central server to a server admin (spec/help S2). Absent elsewhere;
   * the section's own route guard blocks direct-URL entry to match. The gate
   * reads runtime signals, so it lives in navGates; this flag just declares the
   * intent in the one source of truth and is threaded through navModel to the
   * presentation leaf.
   */
  central?: boolean;
  /**
   * The command palette's name for this destination (spec/keyboard ui-surface
   * S1 § Action names). A separate key from `labelKey` because the palette
   * prefixes "Go to:" and sometimes words the destination differently — "Go to:
   * View Stock" against the menu's "Stock".
   *
   * ABSENCE MEANS "not in the palette", and that is a decision rather than an
   * oversight: the spec enumerates exactly which destinations the palette
   * offers, so purchase orders, returns, R&R forms, stock movement, encounters,
   * clinicians, programs, assets, stores, sites, plugins and the rest are
   * reachable by menu only.
   */
  cmdkKey?: LocaleKey;
};

export const navConfig: NavItem[] = [
  { labelKey: 'dashboard', path: 'dashboard', cmdkKey: 'cmdk.goto-dashboard' },
  {
    labelKey: 'replenishment',
    path: 'replenishment',
    children: [
      {
        labelKey: 'label.purchase-orders',
        path: 'replenishment/purchase-order',
      },
      {
        labelKey: 'internal-order',
        path: 'replenishment/internal-order',
        cmdkKey: 'cmdk.goto-internal-order',
      },
      {
        labelKey: 'inbound-shipment',
        path: 'replenishment/inbound-shipment',
        cmdkKey: 'cmdk.goto-inbound',
      },
      {
        labelKey: 'supplier-returns',
        path: 'replenishment/supplier-return',
      },
      {
        labelKey: 'r-and-r-forms',
        path: 'replenishment/r-and-r-forms',
      },
      {
        labelKey: 'suppliers',
        path: 'replenishment/suppliers',
        cmdkKey: 'cmdk.goto-suppliers',
      },
    ],
  },
  {
    labelKey: 'inventory',
    path: 'inventory',
    children: [
      {
        labelKey: 'stock',
        path: 'inventory/stock',
        cmdkKey: 'cmdk.goto-stock',
      },
      {
        labelKey: 'locations',
        path: 'inventory/locations',
        cmdkKey: 'cmdk.goto-locations',
      },
      {
        labelKey: 'stocktakes',
        path: 'inventory/stocktakes',
        cmdkKey: 'cmdk.goto-stocktakes',
      },
      {
        labelKey: 'label.stock-movement',
        path: 'inventory/stock-movement',
      },
    ],
  },
  {
    labelKey: 'distribution',
    path: 'distribution',
    children: [
      {
        labelKey: 'customer-requisition',
        path: 'distribution/customer-requisition',
        cmdkKey: 'cmdk.goto-customer-requisition',
      },
      {
        labelKey: 'outbound-shipment',
        path: 'distribution/outbound-shipment',
        cmdkKey: 'cmdk.goto-outbound',
      },
      {
        labelKey: 'customer-returns',
        path: 'distribution/customer-return',
      },
      {
        labelKey: 'customers',
        path: 'distribution/customers',
        cmdkKey: 'cmdk.goto-customers',
      },
    ],
  },
  {
    labelKey: 'dispensary',
    path: 'dispensary',
    children: [
      {
        labelKey: 'patients',
        path: 'dispensary/patients',
        cmdkKey: 'cmdk.goto-patients',
      },
      {
        labelKey: 'prescriptions',
        path: 'dispensary/prescription',
        cmdkKey: 'cmdk.goto-prescriptions',
      },
      { labelKey: 'encounter', path: 'dispensary/encounter' },
      { labelKey: 'clinicians', path: 'dispensary/clinicians' },
    ],
  },
  {
    labelKey: 'cold-chain',
    path: 'cold-chain',
    children: [
      {
        labelKey: 'equipment',
        path: 'cold-chain/equipment',
        cmdkKey: 'cmdk.goto-cold-chain-equipment',
      },
      {
        labelKey: 'monitoring',
        path: 'cold-chain/monitoring',
        cmdkKey: 'cmdk.goto-cold-chain-monitoring',
      },
      { labelKey: 'sensors', path: 'cold-chain/sensors' },
    ],
  },
  {
    labelKey: 'programs',
    path: 'programs',
    children: [
      {
        labelKey: 'label.programs-immunisations',
        path: 'programs/immunisation-programs',
      },
    ],
  },
  {
    labelKey: 'catalogue',
    path: 'catalogue',
    children: [
      { labelKey: 'assets', path: 'catalogue/assets' },
      {
        labelKey: 'items',
        path: 'catalogue/items',
        cmdkKey: 'cmdk.goto-items',
      },
      {
        labelKey: 'label.master-lists',
        path: 'catalogue/master-lists',
        cmdkKey: 'cmdk.goto-master-lists',
      },
    ],
  },
  {
    labelKey: 'manage',
    path: 'manage',
    children: [
      { labelKey: 'stores', path: 'manage/stores' },
      {
        labelKey: 'indicators-demographics',
        path: 'manage/indicators-demographics',
      },
      {
        labelKey: 'global-preferences',
        path: 'manage/global-preferences',
      },
      { labelKey: 'manage-equipment', path: 'manage/equipment' },
      { labelKey: 'campaigns', path: 'manage/campaigns' },
      { labelKey: 'sites', path: 'manage/sites' },
      { labelKey: 'reports', path: 'manage/reports' },
      { labelKey: 'sync-message', path: 'manage/sync-message' },
      { labelKey: 'plugins', path: 'manage/plugins' },
      {
        labelKey: 'help-documents',
        path: 'manage/help-documents',
        central: true,
      },
    ],
  },
  { labelKey: 'reports', path: 'reports', cmdkKey: 'cmdk.goto-reports' },
  { labelKey: 'settings', path: 'settings' },
  { labelKey: 'help', path: 'help' },
];

// Flattened list of every destination (sections + inner entries) — used to
// generate one route each.
export const navDestinations: NavItem[] = navConfig.flatMap(item => [
  item,
  ...(item.children ?? []),
]);

// The trail from the top-level section down to a destination, root first — the
// breadcrumb a page shows (e.g. 'inventory/stocktakes' → [Inventory,
// Stocktakes]). A top-level destination is its own single-crumb trail; an
// unknown path has none.
export const navTrail = (path: string): NavItem[] => {
  for (const section of navConfig) {
    if (section.path === path) return [section];
    const child = section.children?.find(entry => entry.path === path);
    if (child) return [section, child];
  }
  return [];
};
