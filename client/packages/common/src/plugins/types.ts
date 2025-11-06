import { ColumnDef, UsePluginEvents } from '@openmsupply-client/common';
import {
  ItemFragment,
  NameFragment,
  RequestFragment,
  RequestLineFragment,
  StockLineRowFragment,
} from '@openmsupply-client/system';
import { InboundFragment } from '@openmsupply-client/invoices';
import { PrescriptionPaymentComponentProps } from './prescriptionTypes';

export type Plugins = {
  prescriptionPaymentForm?: React.ComponentType<PrescriptionPaymentComponentProps>[];
  itemProperties?: {
    ItemSellPrice?: React.ComponentType<{ item: ItemFragment }>[];
    ItemFooter?: React.ComponentType<{ itemId: string }>[];
  };
  inboundShipmentAppBar?: React.ComponentType<{ shipment: InboundFragment }>[];
  itemSellPrice?: {
    catalogueSellPrice: React.ComponentType<{ item: ItemFragment }>[];
    internalOrderPrice?: (
      supplierData?: Partial<NameFragment>
    ) => ColumnDef<RequestLineFragment>[]; // TODO check correct supplier data and type with supply levels
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
};

type PluginData<D> = { relatedRecordId?: string | null; data: D };
export type PluginDataStore<T, D> = {
  data: PluginData<D>[];
  set: (data: PluginData<D>[]) => void;
  getById: (row: T) => PluginData<D> | undefined;
};
