import { ColumnDefinition, UsePluginEvents } from '@openmsupply-client/common';
import { StockLineRowFragment } from '@openmsupply-client/system';
import { InboundFragment } from '@openmsupply-client/invoices';

export type Plugins = {
  stockEditForm?: React.ComponentType<{
    stockLine: StockLineRowFragment;
    events: UsePluginEvents<{ id: string }, void>;
  }>[];
  inboundShipmentAppBar?: React.ComponentType<{ shipment: InboundFragment }>[];
  dashboard?: React.ComponentType[];
  stockColumn?: {
    StateLoader: React.ComponentType<{ stockLines: StockLineRowFragment[] }>[];
    columns: ColumnDefinition<StockLineRowFragment>[];
  };
};
