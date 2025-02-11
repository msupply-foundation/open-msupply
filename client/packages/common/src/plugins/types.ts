import { ColumnDefinition, UsePluginEvents } from '@openmsupply-client/common';
import { StockLineRowFragment } from '@openmsupply-client/system';
import { InboundFragment } from '@openmsupply-client/invoices';

export type Plugins = {
  stockEditForm?: React.ComponentType<{
    stockLine: StockLineRowFragment;
    events: UsePluginEvents<{ isDirty: boolean }>;
  }>[];
  inboundShipmentAppBar?: React.ComponentType<{ shipment: InboundFragment }>[];
  dashboard?: React.ComponentType[];
  stockColumn?: {
    StateLoader: React.ComponentType<{ stockLines: StockLineRowFragment[] }>[];
    columns: ColumnDefinition<StockLineRowFragment>[];
  };
};

type PluginData<D> = { relatedRecordId: string; data: D };
export type PluginDataStore<T, D> = {
  data: PluginData<D>[];
  set: (data: PluginData<D>[]) => void;
  getById: (row: T) => PluginData<D> | undefined;
};
