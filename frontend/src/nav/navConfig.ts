// The navigation destination registry (spec/navigation › behaviours — the
// registry tables there are the source of truth this file transcribes). One
// source: the left menu renders from it, the router generates a route per
// destination from it, and the command palette lists every destination in it
// (D107 — `cmdkKey` only renames a row, it never decides whether there is one).
//
// Paths are relative to the store root (/{storeId}). A section's own `path` is
// a landing destination; its `children` are the inner sub-menu entries.
//
// Labels are i18n keys, not English (kdd/type-safety: LocaleKey is derived from
// the catalog, so a typo or an un-added key stops compiling); each key is the
// one spec/navigation cites from the reference app's call sites. Every renderer
// that shows a destination — MenuBar, Breadcrumb, EntryPage title, the command
// palette — resolves the key with t() at render time, so every surface
// re-translates on a language switch.

import type { LocaleKey } from '../intl';
import type { UserPermission } from '../store/storeContext';

/**
 * The capability-gate vocabulary (spec/navigation › the gate vocabulary). A
 * gate names a condition of the STORE, DEPLOYMENT, or SERVER — when it fails,
 * the function isn't available here at all, so the destination is absent from
 * every surface and its route is unreachable (D70). Contrast `permission`
 * below. The runtime predicate for each name lives in navGates (this file
 * stays a plain declarative tree).
 */
export type NavCapability =
  | 'dispensary'
  | 'programModule'
  | 'vaccineModule'
  | 'procurement'
  | 'central'
  | 'centralAdmin';

export type NavItem = {
  labelKey: LocaleKey;
  path: string;
  children?: NavItem[];
  /**
   * Capability gate (spec/navigation › capability gates). A section's gate
   * applies to all its children; a child's gate composes with its section's
   * (Programs › Immunizations = central AND vaccineModule). Absent = always
   * available.
   */
  gate?: NavCapability;
  /**
   * The user permission the destination's primary read requires
   * (spec/navigation › permission gates, values per its contract). Failing it
   * does NOT hide the entry — the store has the function, so the user should
   * see it — but activating it (menu, palette, or direct URL) refuses with the
   * permission-denied dialog instead of navigating (D94).
   */
  permission?: UserPermission;
  /**
   * Offered at phone width (spec/navigation › mobile-friendly, D95). Absent =
   * withheld from the phone menu until the destination's screens are made
   * phone-ready; flipping this one flag is the whole change.
   */
  mobileFriendly?: true;
  /**
   * OVERRIDE for the command palette's name, complete with its "Go to:" prefix
   * (spec/keyboard ui-surface S1 § Action names).
   *
   * ABSENCE IS THE NORM: every destination is in the palette, named "Go to:"
   * plus its own `labelKey` — so a destination added here (a plugin-contributed
   * page included) is browsable with no second registration to remember, which
   * is the whole point of the palette deriving from this file (D107). Set this
   * only where the menu's label does not stand up outside the menu, which is
   * where the menu's column supplies context the palette row lacks: "Stock"
   * under Inventory reads as "View Stock", "Equipment" under Cold chain needs
   * saying, and Manage's "Reports" would otherwise be a second row identical to
   * the top-level one.
   */
  cmdkKey?: LocaleKey;
};

export const navConfig: NavItem[] = [
  { labelKey: 'dashboard', path: 'dashboard' },
  {
    labelKey: 'replenishment',
    path: 'replenishment',
    children: [
      {
        labelKey: 'purchase-order',
        path: 'replenishment/purchase-order',
        gate: 'procurement',
        permission: 'PURCHASE_ORDER_QUERY',
      },
      {
        labelKey: 'internal-order',
        path: 'replenishment/internal-order',
        permission: 'REQUISITION_QUERY',
      },
      {
        labelKey: 'inbound-shipment',
        path: 'replenishment/inbound-shipment',
        permission: 'INBOUND_SHIPMENT_QUERY',
        mobileFriendly: true,
      },
      {
        labelKey: 'supplier-returns',
        path: 'replenishment/supplier-return',
        permission: 'SUPPLIER_RETURN_QUERY',
      },
      {
        labelKey: 'r-and-r-forms',
        path: 'replenishment/r-and-r-forms',
        gate: 'programModule',
        permission: 'RNR_FORM_QUERY',
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
      {
        labelKey: 'stock',
        path: 'inventory/stock',
        permission: 'STOCK_LINE_QUERY',
        cmdkKey: 'cmdk.goto-stock',
      },
      {
        labelKey: 'locations',
        path: 'inventory/locations',
      },
      {
        labelKey: 'stocktakes',
        path: 'inventory/stocktakes',
        permission: 'STOCKTAKE_QUERY',
      },
      {
        labelKey: 'stock-movement',
        path: 'inventory/stock-movement',
        permission: 'STOCK_LINE_QUERY',
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
        permission: 'REQUISITION_QUERY',
        cmdkKey: 'cmdk.goto-customer-requisition',
      },
      {
        labelKey: 'outbound-shipment',
        path: 'distribution/outbound-shipment',
        permission: 'OUTBOUND_SHIPMENT_QUERY',
      },
      {
        labelKey: 'customer-returns',
        path: 'distribution/customer-return',
        permission: 'CUSTOMER_RETURN_QUERY',
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
    gate: 'dispensary',
    children: [
      {
        labelKey: 'patients',
        path: 'dispensary/patients',
        permission: 'PATIENT_QUERY',
      },
      {
        labelKey: 'prescriptions',
        path: 'dispensary/prescription',
        permission: 'PRESCRIPTION_QUERY',
      },
      {
        labelKey: 'encounter',
        path: 'dispensary/encounter',
        gate: 'programModule',
      },
      { labelKey: 'clinicians', path: 'dispensary/clinicians' },
    ],
  },
  {
    labelKey: 'cold-chain',
    path: 'cold-chain',
    gate: 'vaccineModule',
    children: [
      {
        labelKey: 'equipment',
        path: 'cold-chain/equipment',
        permission: 'ASSET_QUERY',
        mobileFriendly: true,
        cmdkKey: 'cmdk.goto-cold-chain-equipment',
      },
      {
        labelKey: 'monitoring',
        path: 'cold-chain/monitoring',
        permission: 'SENSOR_QUERY',
        cmdkKey: 'cmdk.goto-cold-chain-monitoring',
      },
      {
        labelKey: 'sensors',
        path: 'cold-chain/sensors',
        permission: 'SENSOR_QUERY',
      },
    ],
  },
  {
    labelKey: 'programs',
    path: 'programs',
    gate: 'central',
    children: [
      {
        labelKey: 'label.programs-immunisations',
        path: 'programs/immunisations',
        gate: 'vaccineModule',
      },
    ],
  },
  {
    labelKey: 'catalogue',
    path: 'catalogue',
    children: [
      {
        labelKey: 'assets',
        path: 'catalogue/assets',
        permission: 'ASSET_QUERY',
      },
      {
        labelKey: 'items',
        path: 'catalogue/items',
      },
      {
        labelKey: 'master-lists',
        path: 'catalogue/master-lists',
      },
    ],
  },
  {
    labelKey: 'manage',
    path: 'manage',
    gate: 'central',
    children: [
      { labelKey: 'stores', path: 'manage/stores' },
      {
        labelKey: 'indicators-demographics',
        path: 'manage/indicators-demographics',
        gate: 'vaccineModule',
      },
      {
        labelKey: 'global-preferences',
        path: 'manage/global-preferences',
      },
      {
        labelKey: 'manage-equipment',
        path: 'manage/equipment',
        gate: 'vaccineModule',
      },
      { labelKey: 'campaigns', path: 'manage/campaigns' },
      {
        labelKey: 'custom-fields',
        path: 'manage/custom-fields',
        gate: 'centralAdmin',
      },
      { labelKey: 'sites', path: 'manage/sites', gate: 'centralAdmin' },
      {
        labelKey: 'reports',
        path: 'manage/reports',
        gate: 'centralAdmin',
        // Shares `labelKey` with the top-level Reports destination, and a
        // server admin is offered both — two identical palette rows going to
        // different screens. The menu's column tells them apart; the palette
        // needs the name to.
        cmdkKey: 'cmdk.goto-manage-reports',
      },
      {
        labelKey: 'sync-message',
        path: 'manage/sync-message',
        gate: 'centralAdmin',
      },
      { labelKey: 'plugins', path: 'manage/plugins', gate: 'centralAdmin' },
      {
        labelKey: 'help-documents',
        path: 'manage/help-documents',
        gate: 'centralAdmin',
      },
    ],
  },
  {
    labelKey: 'reports',
    path: 'reports',
    permission: 'REPORT',
  },
  { labelKey: 'settings', path: 'settings', mobileFriendly: true },
  { labelKey: 'help', path: 'help', mobileFriendly: true },
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
