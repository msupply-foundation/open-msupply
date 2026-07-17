// The navigation tree, mirroring the reference host app (Site.tsx + the section
// Nav components). One source of truth: the left menu renders from it, and the
// router generates a route per destination from it.
//
// Paths are relative to the store root (/{storeId}). A section's own `path` is
// a landing destination; its `children` are the inner sub-menu entries.
//
// Labels are i18n keys, not English (kdd/type-safety: LocaleKey is derived from
// the catalog, so a typo or an un-added key stops compiling). Every renderer
// that shows a destination — MenuBar, Breadcrumb, EntryPage title — resolves
// the key with t() at render time, so the menu re-translates on a language
// switch.

import type { LocaleKey } from '../intl';

export type NavItem = {
  labelKey: LocaleKey;
  path: string;
  children?: NavItem[];
};

export const navConfig: NavItem[] = [
  { labelKey: 'nav.dashboard', path: 'dashboard' },
  {
    labelKey: 'replenishment',
    path: 'replenishment',
    children: [
      {
        labelKey: 'label.purchase-orders',
        path: 'replenishment/purchase-order',
      },
      {
        labelKey: 'nav.replenishment.internal-order',
        path: 'replenishment/internal-order',
      },
      {
        labelKey: 'nav.replenishment.inbound-shipment',
        path: 'replenishment/inbound-shipment',
      },
      {
        labelKey: 'nav.replenishment.supplier-return',
        path: 'replenishment/supplier-return',
      },
      {
        labelKey: 'nav.replenishment.r-and-r-forms',
        path: 'replenishment/r-and-r-forms',
      },
      {
        labelKey: 'suppliers',
        path: 'replenishment/suppliers',
      },
    ],
  },
  {
    labelKey: 'inventory',
    path: 'inventory',
    children: [
      { labelKey: 'stock', path: 'inventory/stock' },
      { labelKey: 'locations', path: 'inventory/locations' },
      { labelKey: 'stocktakes', path: 'inventory/stocktakes' },
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
        labelKey: 'nav.distribution.customer-requisition',
        path: 'distribution/customer-requisition',
      },
      {
        labelKey: 'nav.distribution.outbound-shipment',
        path: 'distribution/outbound-shipment',
      },
      {
        labelKey: 'nav.distribution.customer-return',
        path: 'distribution/customer-return',
      },
      {
        labelKey: 'customers',
        path: 'distribution/customers',
      },
    ],
  },
  {
    labelKey: 'dispensary',
    path: 'dispensary',
    children: [
      { labelKey: 'nav.dispensary.patients', path: 'dispensary/patients' },
      {
        labelKey: 'nav.dispensary.prescription',
        path: 'dispensary/prescription',
      },
      { labelKey: 'nav.dispensary.encounter', path: 'dispensary/encounter' },
      { labelKey: 'clinicians', path: 'dispensary/clinicians' },
    ],
  },
  {
    labelKey: 'nav.cold-chain',
    path: 'cold-chain',
    children: [
      { labelKey: 'nav.cold-chain.equipment', path: 'cold-chain/equipment' },
      { labelKey: 'monitoring', path: 'cold-chain/monitoring' },
      { labelKey: 'sensors', path: 'cold-chain/sensors' },
    ],
  },
  {
    labelKey: 'nav.programs',
    path: 'programs',
    children: [
      {
        labelKey: 'nav.programs.immunisation-programs',
        path: 'programs/immunisation-programs',
      },
    ],
  },
  {
    labelKey: 'nav.catalogue',
    path: 'catalogue',
    children: [
      { labelKey: 'assets', path: 'catalogue/assets' },
      { labelKey: 'nav.catalogue.items', path: 'catalogue/items' },
      {
        labelKey: 'label.master-lists',
        path: 'catalogue/master-lists',
      },
    ],
  },
  {
    labelKey: 'manage',
    path: 'manage',
    children: [
      { labelKey: 'nav.manage.stores', path: 'manage/stores' },
      {
        labelKey: 'nav.manage.indicators-demographics',
        path: 'manage/indicators-demographics',
      },
      {
        labelKey: 'global-preferences',
        path: 'manage/global-preferences',
      },
      { labelKey: 'nav.manage.equipment', path: 'manage/equipment' },
      { labelKey: 'campaigns', path: 'manage/campaigns' },
      { labelKey: 'sites', path: 'manage/sites' },
      { labelKey: 'reports', path: 'manage/reports' },
      { labelKey: 'nav.manage.sync-message', path: 'manage/sync-message' },
      { labelKey: 'plugins', path: 'manage/plugins' },
    ],
  },
  { labelKey: 'reports', path: 'reports' },
  { labelKey: 'settings', path: 'settings' },
  { labelKey: 'help', path: 'help' },
];

// Flattened list of every destination (sections + inner entries) — used to
// generate one route each.
export const navDestinations: NavItem[] = navConfig.flatMap(item => [
  item,
  ...(item.children ?? []),
]);
