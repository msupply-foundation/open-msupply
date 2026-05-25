import { Plugins, ReportsIcon } from '@openmsupply-client/common';
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
  ExamplePluginConfigComponent,
} from './Configuration';

const ReplenishmentAndSyncStatus: Plugins = {
  // Plugin configuration UI surfaced from Manage > Plugins. A plugin provides
  // either:
  //   - `Component`: a custom React component (used here — see
  //     ./Configuration/ConfigComponent.tsx). Full freedom over the UI.
  //   - `jsonForms`: a `{ schema, uiSchema }` pair that the host renders with
  //     the shared JSON Forms renderer. Less code; constrained to the
  //     controls JSON Forms ships.
  // The commented-out block below shows the JSON Forms equivalent of this
  // plugin's config for plugin-author reference.
  configuration: {
    defaultConfig: DEFAULT_EXAMPLE_PLUGIN_CONFIG,
    Component: ExamplePluginConfigComponent,
    // jsonForms: {
    //   schema: {
    //     type: 'object',
    //     properties: {
    //       enabled: { type: 'boolean', title: 'Show Sync Status widget' },
    //       logPrefix: {
    //         type: 'string',
    //         title: 'Sync widget title',
    //         description:
    //           'Shown in the Sync Status dashboard widget and prefixed to ' +
    //           'backend processor log lines.',
    //       },
    //     },
    //     required: ['logPrefix'],
    //   },
    //   uiSchema: {
    //     type: 'VerticalLayout',
    //     elements: [
    //       { type: 'Control', scope: '#/properties/enabled' },
    //       { type: 'Control', scope: '#/properties/logPrefix' },
    //     ],
    //   },
    // },
  },
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
