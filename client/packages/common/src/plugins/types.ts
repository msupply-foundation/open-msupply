import { ColumnDef, UsePluginEvents } from '@openmsupply-client/common';
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
  itemSellPrice?: {
    catalogueUnitPrice: React.ComponentType<{ itemId: string }>[];
  };
  dashboard?: React.ComponentType[];
  stockLine?: {
    tableStateLoader: React.ComponentType<{
      stockLines: StockLineRowFragment[];
    }>[];
    tableColumn: ColumnDef<StockLineRowFragment>[];
    editViewField: React.ComponentType<{
      stockLine: StockLineRowFragment;
      events: UsePluginEvents<{ isDirty: boolean }>;
    }>[];
  };
  requestRequisitionLine?: {
    tableStateLoader: React.ComponentType<{
      requestLines: RequestLineFragment[];
      requisition?: RequestFragment;
    }>[];
    tableColumn: ColumnDef<RequestLineFragment>[];
    editViewField: React.ComponentType<{
      line: RequestLineFragment;
      unitName?: string;
    }>[];
    editViewInfo: React.ComponentType<{
      line: RequestLineFragment;
      requisition: RequestFragment;
    }>[];
  };
  requestRequisitionSidePanel?: {
    detailPanelSection: React.ComponentType<{
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
