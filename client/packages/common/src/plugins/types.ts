import type { ColumnDef, UsePluginEvents } from '@openmsupply-client/common';
import type {
  ItemFragment,
  MasterListRowFragment,
  RequestFragment,
  RequestLineFragment,
  StockLineRowFragment,
} from '@openmsupply-client/system';
import type { InboundFragment } from '@openmsupply-client/invoices';
import type { PrescriptionPaymentComponentProps } from './prescriptionTypes';
import type { DraftRequestLine } from 'packages/requisitions/src/RequestRequisition/DetailView/RequestLineEdit';

export type Plugins = {
  prescriptionPaymentForm?: React.ComponentType<PrescriptionPaymentComponentProps>[];
  inboundShipmentAppBar?: React.ComponentType<{ shipment: InboundFragment }>[];
  item?: {
    detailViewField: React.ComponentType<{ item: ItemFragment }>[];
  };
  dashboard?: {
    widget?: { Component: React.ComponentType; hiddenWidgets?: string[] }[];
    panel?: {
      Component: React.ComponentType<{ widgetContext: string }>;
      hiddenPanels?: string[];
    }[];
    statistic?: {
      Component: React.ComponentType<{
        panelContext: string;
      }>;
      hiddenStats?: string[];
    }[];
  };
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
      requisition: RequestFragment;
    }>[];
    tableColumn: ColumnDef<RequestLineFragment>[];
    editViewField: React.ComponentType<{
      line: RequestLineFragment;
      draft?: DraftRequestLine;
      unitName?: string;
    }>[];
    editViewInfo: React.ComponentType<{
      line: RequestLineFragment;
      requisition: RequestFragment;
    }>[];
    hideInfo?: string[];
  };
  requestRequisition?: {
    sidePanelSection: React.ComponentType<{
      requisition: RequestFragment;
    }>[];
  };
  masterLists?: {
    tableStateLoader: React.ComponentType<{
      masterLists: MasterListRowFragment[];
    }>[];
    tableColumn: ColumnDef<MasterListRowFragment>[];
  };
};

type PluginData<D> = { relatedRecordId?: string | null; data: D };
export type PluginDataStore<T, D> = {
  data: PluginData<D>[];
  set: (data: PluginData<D>[]) => void;
  getById: (row: T) => PluginData<D> | undefined;
};
