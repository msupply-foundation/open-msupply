export type ReportCategory =
  | 'Stock & Items'
  | 'Distribution'
  | 'Replenishment'
  | 'Programs'
  | 'Other';

export interface ReportDefinition {
  code: string;
  displayName: string;
  category: ReportCategory;
  hasArguments: boolean;
  subContext: string;
  requiresProgramModule?: boolean;
}

export const STANDARD_REPORTS: ReportDefinition[] = [
  {
    code: 'expiring-items',
    displayName: 'Expiring Items',
    category: 'Stock & Items',
    hasArguments: true,
    subContext: 'StockAndItems',
  },
  {
    code: 'inventory_adjustments',
    displayName: 'Inventory Adjustments',
    category: 'Stock & Items',
    hasArguments: true,
    subContext: 'StockAndItems',
  },
  {
    code: 'item-list',
    displayName: 'Item List',
    category: 'Stock & Items',
    hasArguments: true,
    subContext: 'StockAndItems',
  },
  {
    code: 'item-usage',
    displayName: 'Item Usage',
    category: 'Stock & Items',
    hasArguments: true,
    subContext: 'StockAndItems',
  },
  {
    code: 'stock-detail',
    displayName: 'Stock Detail',
    category: 'Stock & Items',
    hasArguments: true,
    subContext: 'StockAndItems',
  },
  {
    code: 'stock-status',
    displayName: 'Stock Status',
    category: 'Stock & Items',
    hasArguments: true,
    subContext: 'StockAndItems',
  },
  {
    code: 'outbound-shipments',
    displayName: 'Outbound Shipments',
    category: 'Distribution',
    hasArguments: true,
    subContext: 'Distribution',
  },
  {
    code: 'inbound-shipments',
    displayName: 'Inbound Shipments',
    category: 'Replenishment',
    hasArguments: true,
    subContext: 'Replenishment',
  },
  {
    code: 'pending-encounters',
    displayName: 'Pending Encounters',
    category: 'Programs',
    hasArguments: true,
    subContext: 'Encounters',
    requiresProgramModule: true,
  },
];
