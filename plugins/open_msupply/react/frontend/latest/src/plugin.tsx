import {
  Plugins,
  PluginConfiguration,
  ReportsIcon,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import ShippingStatus from './ShippingStatus/ShippingStatus';
import SyncStatus from './Dashboard/SyncStatus';
import StockDonorEdit from './StockDonor/StockDonorEdit';
import * as stockDonor from './StockDonor/StockDonorColumn';
import * as aggregateAmc from './AggregateAmc/AggregateAmcColumn';
import { Info } from './AggregateAmc/AggregateAmcInfo';
import { StockAgingPage } from './Pages/StockAgingPage';
import { ReportingDailyPage } from './Pages/ReportingDailyPage';
import {
  DEFAULT_EXAMPLE_PLUGIN_CONFIG,
  ExamplePluginConfig,
  ExamplePluginConfigComponent,
} from './Configuration';

const ReplenishmentAndSyncStatus: Plugins = {
  // Plugin configuration UI surfaced from Manage > Plugins. The plugin provides
  // a custom React `Component` (see ./Configuration/ConfigComponent.tsx) that
  // edits its config via `value`/`onChange`, with full freedom over the UI.
  // `defaultConfig` seeds the form when no config has been saved yet.
  configuration: {
    defaultConfig: DEFAULT_EXAMPLE_PLUGIN_CONFIG,
    Component: ExamplePluginConfigComponent,
  } satisfies PluginConfiguration<ExamplePluginConfig>,
  inboundShipmentAppBar: [ShippingStatus],
  dashboard: {
    widget: [{ Component: SyncStatus }],
  },
  stockLine: {
    tableStateLoader: [stockDonor.StateLoader],
    tableColumn: [stockDonor.StockDonorColumn],
    editViewField: [StockDonorEdit],
  },
  requestRequisitionLine: {
    tableStateLoader: [aggregateAmc.StateLoader],
    tableColumn: [aggregateAmc.AggregateAmcColumn],
    editViewField: [aggregateAmc.AggregateAmcEditView],
    editViewInfo: [Info],
  },
  pages: [
    {
      route: 'stock-aging',
      Component: StockAgingPage,
      menu: {
        label: 'Stock aging',
        category: { type: 'existing', appRoute: AppRoute.Inventory },
      },
    },
    {
      route: 'daily',
      Component: ReportingDailyPage,
      menu: {
        label: 'Daily',
        category: {
          type: 'new',
          key: 'reporting',
          label: 'Reporting',
          icon: ReportsIcon,
          order: 500,
        },
      },
    },
  ],
};

export default ReplenishmentAndSyncStatus;
