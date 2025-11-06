import {
  ColumnDef,
  ItemStatsNode,
  LocaleKey,
  TypedTFunction,
  UsePluginEvents,
  ValueInfo,
} from '@openmsupply-client/common';
import {
  ItemWithStatsFragment,
  RequestFragment,
  RequestLineFragment,
  StockLineRowFragment,
} from '@openmsupply-client/system';
import { InboundFragment } from '@openmsupply-client/invoices';
import { ResponseLineFragment } from '@openmsupply-client/requisitions/src/ResponseRequisition/api';
import { PrescriptionPaymentComponentProps } from './prescriptionTypes';

export type Plugins = {
  prescriptionPaymentForm?: React.ComponentType<PrescriptionPaymentComponentProps>[];
  inboundShipmentAppBar?: React.ComponentType<{ shipment: InboundFragment }>[];
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
  averageMonthlyDistribution?: {
    requisitionAmdColumn: (
      t: TypedTFunction<LocaleKey>
    ) => ColumnDef<ResponseLineFragment>[];
    internalOrderAmdColumn: (
      t: TypedTFunction<LocaleKey>
    ) => ColumnDef<RequestLineFragment>[];
    editViewField: React.ComponentType<{
      currentItem: ItemWithStatsFragment;
    }>[];
    internalOrderField: (
      t: TypedTFunction<LocaleKey>,
      itemStats?: ItemStatsNode
    ) => ValueInfo[];
  };
};

type PluginData<D> = { relatedRecordId?: string | null; data: D };
export type PluginDataStore<T, D> = {
  data: PluginData<D>[];
  set: (data: PluginData<D>[]) => void;
  getById: (row: T) => PluginData<D> | undefined;
};
