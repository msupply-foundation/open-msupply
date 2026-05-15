import { AppRoute } from '@openmsupply-client/config';
import {
  ColumnDef,
  LocalizedString,
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
import { UserPermission } from '../types/schema';

// Plugins import any icon they want from `@openmsupply-client/common` (e.g.
// `StockIcon`) and pass it directly. The host renders it themed to match the
// built-in navigation; if omitted, a default plugin icon is used.
export type PluginIcon = React.ComponentType<{
  color?: 'primary' | 'inherit';
  fontSize?: 'small' | 'medium' | 'large' | 'inherit';
}>;

export type PluginPageMenu = {
  label: LocalizedString;
  permissions?: UserPermission[];
  category:
    | { type: 'existing'; appRoute: AppRoute }
    | {
        type: 'new';
        key: string;
        label: LocalizedString;
        icon?: PluginIcon;
        order?: number;
      };
};

export type PluginPage = {
  route: string;
  Component: React.ComponentType;
  menu: PluginPageMenu;
  // Stamped by the host in pluginProvider.ts#addPluginBundle. Plugins should
  // not set this; it is optional on the type only so plugin bundles compile.
  pluginCode?: string;
};

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
  pages?: PluginPage[];
};

type PluginData<D> = { relatedRecordId?: string | null; data: D };
export type PluginDataStore<T, D> = {
  data: PluginData<D>[];
  set: (data: PluginData<D>[]) => void;
  getById: (row: T) => PluginData<D> | undefined;
};
