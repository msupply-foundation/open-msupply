import { ColumnDefinition, UsePluginEvents } from '@openmsupply-client/common';
import {
  RequestLineFragment,
  StockLineRowFragment,
} from '@openmsupply-client/system';
import { InboundFragment } from '@openmsupply-client/invoices';
import { PrescriptionPaymentComponentProps } from './prescriptionTypes';

export type Plugins = {
  stockEditForm?: React.ComponentType<{
    stockLine: StockLineRowFragment;
    events: UsePluginEvents<{ isDirty: boolean }>;
  }>[];
  prescriptionPaymentForm?: React.ComponentType<PrescriptionPaymentComponentProps>[];
  inboundShipmentAppBar?: React.ComponentType<{ shipment: InboundFragment }>[];
  dashboard?: React.ComponentType[];
  stockColumn?: {
    StateLoader: React.ComponentType<{ stockLines: StockLineRowFragment[] }>[];
    columns: ColumnDefinition<StockLineRowFragment>[];
  };
  requestRequisitionColumn?: {
    StateLoader: React.ComponentType<{ requestLines: RequestLineFragment[] }>[];
    tableColumns: ColumnDefinition<RequestLineFragment>[];
    editViewFields: React.ComponentType<{ line: RequestLineFragment }>[];
  };
};

type PluginData<D> = { relatedRecordId?: string | null; data: D };
export type PluginDataStore<T, D> = {
  data: PluginData<D>[];
  set: (data: PluginData<D>[]) => void;
  getById: (row: T) => PluginData<D> | undefined;
};
