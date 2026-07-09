// The navigation tree, mirroring the reference host app (Site.tsx + the section
// Nav components). One source of truth: the left menu renders from it, and the
// router generates a route per destination from it.
//
// Paths are relative to the store root (/{storeId}). A section's own `path` is a
// landing destination; its `children` are the inner sub-menu entries.

export type NavItem = {
  label: string;
  path: string;
  children?: NavItem[];
};

export const navConfig: NavItem[] = [
  { label: 'Dashboard', path: 'dashboard' },
  {
    label: 'Replenishment',
    path: 'replenishment',
    children: [
      { label: 'Purchase orders', path: 'replenishment/purchase-order' },
      { label: 'Internal orders', path: 'replenishment/internal-order' },
      { label: 'Inbound shipments', path: 'replenishment/inbound-shipment' },
      { label: 'Supplier returns', path: 'replenishment/supplier-return' },
      { label: 'R&R forms', path: 'replenishment/r-and-r-forms' },
      { label: 'Suppliers', path: 'replenishment/suppliers' },
    ],
  },
  {
    label: 'Inventory',
    path: 'inventory',
    children: [
      { label: 'Stock', path: 'inventory/stock' },
      { label: 'Locations', path: 'inventory/locations' },
      { label: 'Stocktakes', path: 'inventory/stocktakes' },
      { label: 'Stock movement', path: 'inventory/stock-movement' },
    ],
  },
  {
    label: 'Distribution',
    path: 'distribution',
    children: [
      { label: 'Customer requisitions', path: 'distribution/customer-requisition' },
      { label: 'Outbound shipments', path: 'distribution/outbound-shipment' },
      { label: 'Customer returns', path: 'distribution/customer-return' },
      { label: 'Customers', path: 'distribution/customers' },
    ],
  },
  {
    label: 'Dispensary',
    path: 'dispensary',
    children: [
      { label: 'Patients', path: 'dispensary/patients' },
      { label: 'Prescriptions', path: 'dispensary/prescription' },
      { label: 'Encounters', path: 'dispensary/encounter' },
      { label: 'Clinicians', path: 'dispensary/clinicians' },
    ],
  },
  {
    label: 'Cold chain',
    path: 'cold-chain',
    children: [
      { label: 'Equipment', path: 'cold-chain/equipment' },
      { label: 'Monitoring', path: 'cold-chain/monitoring' },
      { label: 'Sensors', path: 'cold-chain/sensors' },
    ],
  },
  {
    label: 'Programs',
    path: 'programs',
    children: [{ label: 'Immunisation programs', path: 'programs/immunisation-programs' }],
  },
  {
    label: 'Catalogue',
    path: 'catalogue',
    children: [
      { label: 'Assets', path: 'catalogue/assets' },
      { label: 'Items', path: 'catalogue/items' },
      { label: 'Master lists', path: 'catalogue/master-lists' },
    ],
  },
  {
    label: 'Manage',
    path: 'manage',
    children: [
      { label: 'Stores', path: 'manage/stores' },
      { label: 'Indicators & demographics', path: 'manage/indicators-demographics' },
      { label: 'Global preferences', path: 'manage/global-preferences' },
      { label: 'Equipment', path: 'manage/equipment' },
      { label: 'Campaigns', path: 'manage/campaigns' },
      { label: 'Sites', path: 'manage/sites' },
      { label: 'Reports', path: 'manage/reports' },
      { label: 'Sync messages', path: 'manage/sync-message' },
      { label: 'Plugins', path: 'manage/plugins' },
    ],
  },
  { label: 'Reports', path: 'reports' },
  { label: 'Settings', path: 'settings' },
  { label: 'Help', path: 'help' },
];

// Flattened list of every destination (sections + inner entries) — used to
// generate one route each.
export const navDestinations: NavItem[] = navConfig.flatMap(item => [
  item,
  ...(item.children ?? []),
]);
