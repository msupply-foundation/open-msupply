import { ColumnDefinition, UsePluginEvents } from '@openmsupply-client/common';
import {
  RequestFragment,
  RequestLineFragment,
  StockLineRowFragment,
} from '@openmsupply-client/system';
import { InboundFragment } from '@openmsupply-client/invoices';
import { PrescriptionPaymentComponentProps } from './prescriptionTypes';

export type Plugins = {
  prescriptionPaymentForm?: React.ComponentType<PrescriptionPaymentComponentProps>[];
  inboundShipmentAppBar?: React.ComponentType<{ shipment: InboundFragment }>[];
  dashboard?: React.ComponentType[];
  stockLine?: {
    tableStateLoader: React.ComponentType<{
      stockLines: StockLineRowFragment[];
    }>[];
    tableColumn: ColumnDefinition<StockLineRowFragment>[];
    editViewField: React.ComponentType<{
      stockLine: StockLineRowFragment;
      events: UsePluginEvents<{ isDirty: boolean }>;
    }>[];
  };
  requestRequisitionLine?: {
    tableStateLoader: React.ComponentType<{
      requestLines: RequestLineFragment[];
    }>[];
    tableColumn: ColumnDefinition<RequestLineFragment>[];
    editViewField: React.ComponentType<{
      line: RequestLineFragment;
      unitName?: string;
    }>[];
    editViewInfo: React.ComponentType<{
      line: RequestLineFragment;
      requisition: RequestFragment;
    }>[];
  };
};

type PluginData<D> = { relatedRecordId?: string | null; data: D };
export type PluginDataStore<T, D> = {
  data: PluginData<D>[];
  set: (data: PluginData<D>[]) => void;
  getById: (row: T) => PluginData<D> | undefined;
};
