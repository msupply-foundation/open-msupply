import type { ComponentType } from 'react';
import type { IconProps } from '@/components/icons';
import {
  StockIcon,
  TruckIcon,
  CustomersIcon,
  ThermometerIcon,
  FileIcon,
  ClockIcon,
  ReportsIcon,
  ListIcon,
  SlidersIcon,
  SettingsIcon,
  RadioIcon,
  HelpIcon,
} from '@/components/icons';

export interface NavLeaf {
  id: string;
  label: string;
  to: string;
}

export interface NavItem {
  id: string;
  label: string;
  to: string;
  icon: ComponentType<IconProps>;
  /** Present → this is an expandable parent section. Absent → a leaf link. */
  children?: NavLeaf[];
}

/*
 * Models the sidebar from the screenshot's deployment (not the code defaults —
 * which are config/permission-driven). Two groups: the scrolling upper list and
 * the pinned lower cluster.
 */
export const upperNav: NavItem[] = [
  {
    id: 'inventory',
    label: 'Inventory',
    to: '/inventory',
    icon: StockIcon,
    children: [
      { id: 'stock', label: 'Stock', to: '/inventory/stock' },
      { id: 'stocktakes', label: 'Stocktakes', to: '/inventory/stocktakes' },
    ],
  },
  {
    id: 'distribution',
    label: 'Distribution',
    to: '/distribution',
    icon: TruckIcon,
    children: [
      {
        id: 'requisitions',
        label: 'Requisitions',
        to: '/distribution/customer-requisition',
      },
      {
        id: 'outbound',
        label: 'Outbound Shipments',
        to: '/distribution/outbound-shipment',
      },
      {
        id: 'returns',
        label: 'Customer Returns',
        to: '/distribution/customer-return',
      },
      { id: 'customers', label: 'Customers', to: '/distribution/customers' },
    ],
  },
  {
    id: 'dispensary',
    label: 'Dispensary',
    to: '/dispensary',
    icon: CustomersIcon,
    children: [
      { id: 'patients', label: 'Patients', to: '/dispensary/patients' },
      {
        id: 'prescriptions',
        label: 'Prescriptions',
        to: '/dispensary/prescription',
      },
    ],
  },
  {
    id: 'cold-chain',
    label: 'Cold chain',
    to: '/cold-chain',
    icon: ThermometerIcon,
    children: [
      { id: 'monitoring', label: 'Monitoring', to: '/cold-chain/monitoring' },
      { id: 'equipment', label: 'Equipment', to: '/cold-chain/equipment' },
    ],
  },
  {
    id: 'programs',
    label: 'Programs',
    to: '/programs',
    icon: FileIcon,
    children: [
      { id: 'immunisation', label: 'Immunisation', to: '/programs/immunisation' },
    ],
  },
  { id: 'daily-tallies', label: 'Daily Tallies', to: '/daily-tallies', icon: ClockIcon },
  { id: 'reports', label: 'Reports', to: '/reports', icon: ReportsIcon },
];

export const lowerNav: NavItem[] = [
  {
    id: 'catalogue',
    label: 'Catalogue',
    to: '/catalogue',
    icon: ListIcon,
    children: [
      { id: 'items', label: 'Items', to: '/catalogue/items' },
      { id: 'assets', label: 'Assets', to: '/catalogue/assets' },
    ],
  },
  {
    id: 'manage',
    label: 'Manage',
    to: '/manage',
    icon: SlidersIcon,
    children: [
      { id: 'facilities', label: 'Facilities', to: '/manage/facilities' },
      { id: 'master-lists', label: 'Master lists', to: '/manage/master-lists' },
    ],
  },
  { id: 'settings', label: 'Settings', to: '/settings', icon: SettingsIcon },
  { id: 'sync', label: 'Sync', to: '/sync', icon: RadioIcon },
  { id: 'help', label: 'Help', to: '/help', icon: HelpIcon },
];
