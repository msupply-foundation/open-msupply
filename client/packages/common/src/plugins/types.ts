import { FunctionComponent } from 'react';
import { ColumnDefinition, RecordWithId } from '@openmsupply-client/common';
import { StockLineRowFragment } from '@openmsupply-client/system';
import { InboundFragment } from '@openmsupply-client/invoices';

type extractDataType<Type> = Type extends ComponentPluginBase<infer DataType>
  ? DataType
  : never;

export type ComponentPluginData<T> = extractDataType<
  Extract<ComponentPlugin, { type: T }>
>;

export type PluginComponent<T> = FunctionComponent<{ data: T }>;

export type PluginModule<DataType> = {
  default: React.ComponentType<{ data?: DataType | undefined }>;
};

export interface ComponentPluginBase<T> {
  component: () => Promise<PluginModule<T>>;
  module: string;
  localModule?: string;
  pluginName: string;
}

export interface ColumnPluginBase<T extends RecordWithId> {
  column: () => Promise<ColumnDefinition<T>>;
  module: string;
  pluginName: string;
}

export type ComponentPluginType =
  | 'Dashboard'
  | 'InboundShipmentAppBar'
  | 'StockEditForm';

export type ColumnPluginType = 'Stock';

export type EventType = 'onSaveStockEditForm' | 'onChangeStockEditForm';

export type StockComponentPlugin = {
  type: 'StockEditForm';
} & ComponentPluginBase<StockLineRowFragment>;

export type StockColumnPlugin = {
  type: 'Stock';
} & ColumnPluginBase<StockLineRowFragment>;

export type InboundShipmentComponentPlugin = {
  type: 'InboundShipmentAppBar';
} & ComponentPluginBase<InboundFragment>;

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
