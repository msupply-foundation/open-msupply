import {
  ColumnDef,
  ColumnDefinition,
  UsePluginEvents,
} from '@openmsupply-client/common';
import {
  ItemFragment,
  MasterListRowFragment,
  RequestFragment,
  RequestLineFragment,
  StockLineRowFragment,
} from '@openmsupply-client/system';
import { InboundFragment } from '@openmsupply-client/invoices';
import { PrescriptionPaymentComponentProps } from './prescriptionTypes';
import { DraftRequestLine } from 'packages/requisitions/src/RequestRequisition/DetailView/RequestLineEdit';

export type Plugins = {
  prescriptionPaymentForm?: React.ComponentType<PrescriptionPaymentComponentProps>[];
  inboundShipmentAppBar?: React.ComponentType<{ shipment: InboundFragment }>[];
  item?: {
    detailViewField: React.ComponentType<{ item: ItemFragment }>[];
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
    // #QUESTION: Do any plugins needs updating?
    tableColumn: ColumnDef<MasterListRowFragment>[];
  };
};

type PluginData<D> = { relatedRecordId?: string | null; data: D };
export type PluginDataStore<T, D> = {
  data: PluginData<D>[];
  set: (data: PluginData<D>[]) => void;
  getById: (row: T) => PluginData<D> | undefined;
};
