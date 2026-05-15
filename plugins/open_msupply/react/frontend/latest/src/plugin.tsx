import { Plugins, ReportsIcon } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import ShippingStatus from './ShippingStatus/ShippingStatus';
import Replenishment from './Dashboard/Replenishment';
import SyncStatus from './Dashboard/SyncStatus';
import StockDonorEdit from './StockDonor/StockDonorEdit';
import * as stockDonor from './StockDonor/StockDonorColumn';
import * as aggregateAmc from './AggregateAmc/AggregateAmcColumn';
import { Info } from './AggregateAmc/AggregateAmcInfo';
import { StockAgingPage } from './Pages/StockAgingPage';
import { ReportingDailyPage } from './Pages/ReportingDailyPage';

const ReplenishmentAndSyncStatus: Plugins = {
  inboundShipmentAppBar: [ShippingStatus],
  dashboard: [Replenishment, SyncStatus],
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
