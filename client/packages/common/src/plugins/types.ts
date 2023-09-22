import { FunctionComponent } from 'react';
import {
  ColumnDefinition,
  InvoiceNode,
  RecordWithId,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '@openmsupply-client/system';

export type PluginComponent<T> = FunctionComponent<{ data: T }>;

export interface ComponentPluginBase<T> {
  Component: PluginComponent<T>;
  isLoaded: boolean;
  module: string;
  localModule: string;
  name: string;
}

export interface ColumnPluginBase<T extends RecordWithId> {
  column: ColumnDefinition<T>;
  isLoaded: boolean;
  module: string;
  name: string;
}

export type ComponentPluginType =
  | 'Dashboard'
  | 'InboundShipmentAppBar'
  | 'StockEditForm';

export type ColumnPluginType = 'Stock';

export type EventType = 'onSave' | 'onCancel' | 'onChange';

export type StockComponentPlugin = {
  type: 'StockEditForm';
} & ComponentPluginBase<StockLineRowFragment>;

export type StockColumnPlugin = {
  type: 'Stock';
} & ColumnPluginBase<StockLineRowFragment>;

export type InboundShipmentComponentPlugin = {
  type: 'InboundShipmentAppBar';
} & ComponentPluginBase<InvoiceNode>;

export type DashboardPlugin = {
  type: 'Dashboard';
} & ComponentPluginBase<Record<string, never>>;

export type ComponentPlugin =
  | StockComponentPlugin
  | InboundShipmentComponentPlugin
  | DashboardPlugin;

export type ColumnPlugin = StockColumnPlugin;

export type PluginDefinition = {
  columnPlugins: ColumnPlugin[];
  componentPlugins: ComponentPlugin[];
};
