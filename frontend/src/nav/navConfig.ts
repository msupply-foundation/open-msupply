// The navigation tree, mirroring the reference host app (Site.tsx + the section
// Nav components). One source of truth: the left menu renders from it, and the
// router generates a route per destination from it.
//
// Paths are relative to the store root (/{storeId}). A section's own `path` is a
// landing destination; its `children` are the inner sub-menu entries.
//
// Labels are i18n keys, not English (kdd/type-safety: LocaleKey is derived from
// the catalog, so a typo or an un-added key stops compiling). Every renderer that
// shows a destination — MenuBar, Breadcrumb, EntryPage title — resolves the key
// with t() at render time, so the menu re-translates on a language switch.

import type { LocaleKey } from '../intl';

export type NavItem = {
  labelKey: LocaleKey;
  path: string;
  children?: NavItem[];
};

export const navConfig: NavItem[] = [
  { labelKey: 'nav.dashboard', path: 'dashboard' },
  {
    labelKey: 'nav.replenishment',
    path: 'replenishment',
    children: [
      {
        labelKey: 'nav.replenishment.purchase-order',
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
        labelKey: 'nav.replenishment.suppliers',
        path: 'replenishment/suppliers',
      },
    ],
  },
  {
    labelKey: 'nav.inventory',
    path: 'inventory',
    children: [
      { labelKey: 'nav.inventory.stock', path: 'inventory/stock' },
      { labelKey: 'nav.inventory.locations', path: 'inventory/locations' },
      { labelKey: 'nav.inventory.stocktakes', path: 'inventory/stocktakes' },
      {
        labelKey: 'nav.inventory.stock-movement',
        path: 'inventory/stock-movement',
      },
    ],
  },
  {
    labelKey: 'nav.distribution',
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
        labelKey: 'nav.distribution.customers',
        path: 'distribution/customers',
      },
    ],
  },
  {
    labelKey: 'nav.dispensary',
    path: 'dispensary',
    children: [
      { labelKey: 'nav.dispensary.patients', path: 'dispensary/patients' },
      {
        labelKey: 'nav.dispensary.prescription',
        path: 'dispensary/prescription',
      },
      { labelKey: 'nav.dispensary.encounter', path: 'dispensary/encounter' },
      { labelKey: 'nav.dispensary.clinicians', path: 'dispensary/clinicians' },
    ],
  },
  {
    labelKey: 'nav.cold-chain',
    path: 'cold-chain',
    children: [
      { labelKey: 'nav.cold-chain.equipment', path: 'cold-chain/equipment' },
      { labelKey: 'nav.cold-chain.monitoring', path: 'cold-chain/monitoring' },
      { labelKey: 'nav.cold-chain.sensors', path: 'cold-chain/sensors' },
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
      { labelKey: 'nav.catalogue.assets', path: 'catalogue/assets' },
      { labelKey: 'nav.catalogue.items', path: 'catalogue/items' },
      {
        labelKey: 'nav.catalogue.master-lists',
        path: 'catalogue/master-lists',
      },
    ],
  },
  {
    labelKey: 'nav.manage',
    path: 'manage',
    children: [
      { labelKey: 'nav.manage.stores', path: 'manage/stores' },
      {
        labelKey: 'nav.manage.indicators-demographics',
        path: 'manage/indicators-demographics',
      },
      {
        labelKey: 'nav.manage.global-preferences',
        path: 'manage/global-preferences',
      },
      { labelKey: 'nav.manage.equipment', path: 'manage/equipment' },
      { labelKey: 'nav.manage.campaigns', path: 'manage/campaigns' },
      { labelKey: 'nav.manage.sites', path: 'manage/sites' },
      { labelKey: 'nav.manage.reports', path: 'manage/reports' },
      { labelKey: 'nav.manage.sync-message', path: 'manage/sync-message' },
      { labelKey: 'nav.manage.plugins', path: 'manage/plugins' },
    ],
  },
  { labelKey: 'nav.reports', path: 'reports' },
  { labelKey: 'nav.settings', path: 'settings' },
  { labelKey: 'nav.help', path: 'help' },
];

// Flattened list of every destination (sections + inner entries) — used to
// generate one route each.
export const navDestinations: NavItem[] = navConfig.flatMap(item => [
  item,
  ...(item.children ?? []),
]);
