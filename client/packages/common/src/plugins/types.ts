import { AppRoute } from '@openmsupply-client/config';
import { ColumnDef, UsePluginEvents } from '@openmsupply-client/common';
import {
  ItemFragment,
  MasterListRowFragment,
  RequestFragment,
  RequestLineFragment,
  StockLineListRowFragment,
  StockLineRowFragment,
} from '@openmsupply-client/system';
import {
  InboundFragment,
  InboundLineFragment,
  StockOutLineFragment,
} from '@openmsupply-client/invoices';
import { PrescriptionPaymentComponentProps } from './prescriptionTypes';
import { DraftRequestLine } from 'packages/requisitions/src/RequestRequisition/DetailView/RequestLineEdit';
import { StocktakeLineFragment } from '@openmsupply-client/inventory';
import { InvoiceNodeStatus, UserPermission } from '../types/schema';

// Plugins import any icon they want from `@openmsupply-client/common` (e.g.
// `StockIcon`) and pass it directly. The host renders it themed to match the
// built-in navigation; if omitted, a default plugin icon is used.
export type PluginIcon = React.ComponentType<{
  color?: 'primary' | 'inherit';
  fontSize?: 'small' | 'medium' | 'large' | 'inherit';
}>;

export type PluginPageMenu = {
  label: string;
  permissions?: UserPermission[];
  category:
    | { type: 'existing'; appRoute: AppRoute }
    | {
        type: 'new';
        key: string;
        label: string;
        icon?: PluginIcon;
        order?: number;
      };
};

export type PluginPage = {
  route: string;
  Component: React.ComponentType;
  menu: PluginPageMenu;
  // Stamped by the host in pluginProvider.ts (stampAndValidatePages). Plugins should
  // not set this; it is optional on the type only so plugin bundles compile.
  pluginCode?: string;
};

export type ShipmentLinePluginState = {
  isDirty?: boolean;
  invalidLines?: Record<string, boolean>;
};

export type Plugins = {
  prescriptionPaymentForm?: React.ComponentType<PrescriptionPaymentComponentProps>[];
  inboundShipmentAppBar?: React.ComponentType<{ shipment: InboundFragment }>[];
  inboundShipment?: {
    // Runs before an inbound shipment status change. Each validator returns a
    // user-facing message to BLOCK the transition, or null to allow it.
    validateStatusChange?: ((
      shipment: InboundFragment,
      targetStatus: InvoiceNodeStatus
    ) => string | null)[];
  };
  inboundShipmentLine?: {
    editViewField: {
      header: string;
      Component: React.ComponentType<{
        line: InboundLineFragment;
        update: (patch: Partial<InboundLineFragment>) => void;
        events: UsePluginEvents<ShipmentLinePluginState>;
      }>;
    }[];
    tableColumn?: ColumnDef<InboundLineFragment>[];
  };
  outboundShipmentLine?: {
    editViewField: {
      header: string;
      Component: React.ComponentType<{
        line: StockOutLineFragment;
        events: UsePluginEvents<ShipmentLinePluginState>;
        isExternal: boolean;
      }>;
    }[];
    tableColumn?: ColumnDef<StockOutLineFragment>[];
  };
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
      stockLines: StockLineListRowFragment[];
    }>[];
    tableColumn: ColumnDef<StockLineListRowFragment>[];
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
  stocktakeLine?: {
    tableColumn: ColumnDef<StocktakeLineFragment>[];
  };
  pages?: PluginPage[];
  // Configuration UI for this plugin. Surfaced from Manage > Plugins. The plugin
  // provides a free-form React `Component` that edits its config via
  // `value`/`onChange`. `defaultConfig` seeds the form when no plugin_data row
  // exists yet for this plugin. Typed as `any` so a plugin can supply a
  // strongly-typed `PluginConfiguration<ItsOwnConfig>` here without casting; the
  // host treats the config as opaque JSON regardless.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configuration?: PluginConfiguration<any>;
};

export type PluginConfiguration<TConfig = unknown> = {
  defaultConfig: TConfig;
  Component: React.ComponentType<{
    value: TConfig;
    onChange: (next: TConfig) => void;
  }>;
};

// Shared React-Query key for a plugin's configuration row. Both the host's
// save hook and any plugin-side read hook should use this so the host's
// invalidate-on-save triggers a live refetch in the plugin without a reload.
// (The host and plugin bundles share the same QueryClient via the federated
// `@openmsupply-client/common` package.)
export const pluginConfigurationQueryKey = (pluginCode: string) =>
  ['pluginConfiguration', pluginCode] as const;

type PluginData<D> = { relatedRecordId?: string | null; data: D };
export type PluginDataStore<T, D> = {
  data: PluginData<D>[];
  set: (data: PluginData<D>[]) => void;
  getById: (row: T) => PluginData<D> | undefined;
};
