import type { Component } from 'solid-js'
import type { IconProps } from '../../icons'
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
} from '../../icons'

export interface NavLeaf {
  id: string
  label: string
  to: string
}

export interface NavItem {
  id: string
  label: string
  to: string
  icon: Component<IconProps>
  /** Present → expandable parent section. Absent → a leaf link. */
  children?: NavLeaf[]
}

/*
 * Models the current app's sidebar for the shell demo. Two groups: the
 * scrolling upper list and the pinned lower cluster. Ported from the RnD
 * prototype's navModel (data only; icons come from our own icon set).
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
      { id: 'requisitions', label: 'Requisitions', to: '/distribution/customer-requisition' },
      { id: 'outbound', label: 'Outbound Shipments', to: '/distribution/outbound-shipment' },
      { id: 'returns', label: 'Customer Returns', to: '/distribution/customer-return' },
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
      { id: 'prescriptions', label: 'Prescriptions', to: '/dispensary/prescription' },
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
    children: [{ id: 'immunisation', label: 'Immunisation', to: '/programs/immunisation' }],
  },
  { id: 'daily-tallies', label: 'Daily Tallies', to: '/daily-tallies', icon: ClockIcon },
  { id: 'reports', label: 'Reports', to: '/reports', icon: ReportsIcon },
]

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
]

/**
 * The nav group a leaf belongs to, if any — drives the header breadcrumb root
 * (e.g. "Distribution / Outbound Shipments"). Top-level leaves (Reports…) and
 * pages outside the nav (Home) have no parent and get a single crumb.
 */
export const findNavParent = (leafId: string): NavItem | undefined =>
  [...upperNav, ...lowerNav].find((item) => item.children?.some((c) => c.id === leafId))
