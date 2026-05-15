import React from 'react';
import { CustomersIcon } from './Customers';
import { DashboardIcon } from './Dashboard';
import { InvoiceIcon } from './Invoice';
import { ListIcon } from './List';
import { PluginIcon } from './Plugin';
import { ReportsIcon } from './Reports';
import { SlidersIcon } from './Sliders';
import { StockIcon } from './Stock';
import { SuppliersIcon } from './Suppliers';
import { ThermometerIcon } from './Thermometer';
import { TruckIcon } from './Truck';

// Plugins running across the module-federation boundary can reference these
// names instead of bundling their own icon components — keeps the visual
// language consistent with built-in navigation.
export const pluginIconRegistry: Record<string, React.ComponentType> = {
  catalogue: ListIcon,
  'cold-chain': ThermometerIcon,
  dashboard: DashboardIcon,
  dispensary: CustomersIcon,
  distribution: TruckIcon,
  inventory: StockIcon,
  manage: SlidersIcon,
  plugin: PluginIcon,
  programs: InvoiceIcon,
  replenishment: SuppliersIcon,
  reports: ReportsIcon,
  sliders: SlidersIcon,
  stock: StockIcon,
};
