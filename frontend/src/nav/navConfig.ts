// The navigation destination registry (spec/navigation › behaviours — the
// registry tables there are the source of truth this file transcribes). One
// source: the left menu renders from it, the router generates a route per
// destination from it, and the command palette lists every destination in it
// (D107 — `cmdkKey` only renames a row, it never decides whether there is one).
//
// Paths are relative to the store root (/{storeId}). A section's own `path` is
// a landing destination; its `children` are the inner sub-menu entries.
//
// Home's path is the EMPTY string, which is not a special case but the literal
// reading of the line above: Home IS the store root, so its store-relative path
// is nothing. The brand mark has always gone there, so giving the menu entry
// the same target is what stops one screen from having two URLs.
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
   * withholds the entry for that user exactly as a failed capability gate does
   * — absent from menu and palette, its URL landing on Home with no dialog
   * (D94). The server stays the real guard.
   */
  permission?: UserPermission;
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
  // Home — the store root itself (see the empty-path note above). `label.home`
  // is the key the brand mark's accessible name already used, so the logo and
  // the menu entry name one destination with one word. Every surface that
  // shows it (menu, palette, breadcrumb, tab title) reads this one key.
  { labelKey: 'label.home', path: '' },
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
        // The dispensing vertical, relabelled "Dispensing" (its path and spec
        // folder keep their old names) — the "Prescriptions" name belongs to
        // the prescriber's side, which this registry does NOT offer: prescriber
        // mode is the only way into it (§ prescriber mode, PM-9).
        labelKey: 'dispensing',
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
  { labelKey: 'settings', path: 'settings' },
  { labelKey: 'help', path: 'help' },
];

/**
 * The SECOND registry: what a prescriber-mode user is offered
 * (spec/prescription-requests § prescriber mode). A user holding the
 * PRESCRIBER_MODE permission in the entered store navigates from this tree
 * instead of `navConfig` — navGates' `activeNavConfig` picks between them, and
 * every surface reads the result, so the menu, the command palette and the
 * router agree here exactly as they do for the full registry.
 *
 * A SEPARATE TREE rather than a `notPrescriber` gate on the ~37 destinations
 * this omits. Prescriber mode is not "the app minus a section" — it is three
 * destinations plus the two chrome entries every user needs — and spelling that
 * out as an inverse gate on nearly every row of the registry above would smear
 * one decision across the whole file, where the next person to add a
 * destination would have to remember to exclude it. Here, forgetting is the
 * safe direction: a new destination is absent from prescriber mode until
 * somebody adds it deliberately.
 *
 * Paths and label keys are COPIED from their rows above, not re-invented: these
 * are the same destinations, reached the same way, and App.tsx keys the same
 * `sectionRoutes` off them.
 *
 * What is missing and why:
 *   Home        prescribers land on the request list, which is the screen they
 *               came for; a dashboard of stock widgets with the stock removed
 *               is a worse landing page than no dashboard.
 *   Dispensing  stock allocation, pricing and payments — the dispenser's job,
 *               and where the data a prescriber has no use for lives.
 *   Reports     the one remaining route that surfaces stock and financial
 *               figures; its permission gates HAVING reports, not which ones.
 *   Clinicians  there is no clinician picker any more (§ who is recorded), so
 *               the list has nothing to feed.
 *
 * The dispensary gate is kept on the two dispensary destinations even though a
 * prescriber-mode user cannot reach a non-dispensary store (the store picker
 * withholds it): the gate is what makes that unreachability true on the route
 * as well, and a registry that only works because of a filter somewhere else is
 * one refactor from being wrong.
 */
export const prescriberNavConfig: NavItem[] = [
  {
    labelKey: 'dispensary',
    path: 'dispensary',
    gate: 'dispensary',
    children: [
      {
        // "Prescriptions" — the prescriber's own record. The landing screen
        // (see PRESCRIBER_HOME_PATH), and the redirect target for anything
        // this registry does not offer.
        labelKey: 'prescriptions',
        path: 'dispensary/prescription-request',
        permission: 'PRESCRIPTION_QUERY',
      },
      {
        labelKey: 'patients',
        path: 'dispensary/patients',
        permission: 'PATIENT_QUERY',
      },
    ],
  },
  {
    labelKey: 'catalogue',
    path: 'catalogue',
    children: [
      // What can be prescribed. A prescriber who cannot look an item up
      // prescribes things the dispensary cannot fill.
      { labelKey: 'items', path: 'catalogue/items' },
    ],
  },
  // Chrome, not function: language and the logout path live behind Settings,
  // so cutting it would strand the user in the three screens above.
  { labelKey: 'settings', path: 'settings' },
  { labelKey: 'help', path: 'help' },
];

/**
 * Where a prescriber-mode user starts, and where the router sends them when
 * they reach for a destination this registry does not offer (a bookmark from
 * before the mode was granted, a typed URL, a link from someone else's
 * session). The full registry redirects to Home for the same case; prescriber
 * mode has no Home, so it names its landing screen instead.
 */
export const PRESCRIBER_HOME_PATH = 'dispensary/prescription-request';

// Flattened list of every destination (sections + inner entries) — used to
// generate one route each. Takes the registry rather than reading `navConfig`,
// so prescriber mode gets the same treatment from the same code.
export const flattenNav = (config: NavItem[]): NavItem[] =>
  config.flatMap(item => [item, ...(item.children ?? [])]);

export const navDestinations: NavItem[] = flattenNav(navConfig);

/**
 * Destinations the PRESCRIBER registry offers that the full one does not —
 * today, the prescription-request list alone (spec/prescription-requests §
 * prescriber mode, PM-9). Prescriber mode is the only way in, so outside it
 * these addresses are REFUSED rather than merely absent: an ordinary user in
 * the same store would otherwise reach the prescriber's screens by typing the
 * URL, since Dispensary's own gate admits everything beneath it.
 *
 * DERIVED, not listed: the two trees above are the statement, and a destination
 * moved into or out of either one changes this set with it — a hand-kept list
 * would be the third place to remember. Computed once at module scope: both
 * trees are static.
 */
export const prescriberOnlyPaths: string[] = flattenNav(
  prescriberNavConfig
).flatMap(dest =>
  navDestinations.some(offered => offered.path === dest.path) ? [] : [dest.path]
);

// The trail from the top-level section down to a destination, root first — the
// breadcrumb a page shows (e.g. 'inventory/stocktakes' → [Inventory,
// Stocktakes]). A top-level destination is its own single-crumb trail; an
// unknown path has none.
export const trailIn = (config: NavItem[], path: string): NavItem[] => {
  for (const section of config) {
    if (section.path === path) return [section];
    const child = section.children?.find(entry => entry.path === path);
    if (child) return [section, child];
  }
  return [];
};

export const navTrail = (path: string): NavItem[] => trailIn(navConfig, path);
