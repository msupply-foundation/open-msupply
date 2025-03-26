import { Plugins } from '@openmsupply-client/common';
import ShippingStatus from './ShippingStatus/ShippingStatus';
import Replenishment from './Dashboard/Replenishment';
import SyncStatus from './Dashboard/SyncStatus';
import StockDonorEdit from './StockDonor/StockDonorEdit';
import * as stockDonor from './StockDonor/StockDonorColumn';
import * as aggregateAmc from './AggregateAmc/AggregateAmcColumn';
import { Info } from './AggregateAmc/AggregateAmcInfo';

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
};

export default ReplenishmentAndSyncStatus;
