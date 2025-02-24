import { Plugins } from '@openmsupply-client/common';
import ShippingStatus from './ShippingStatus/ShippingStatus';
import Replenishment from './Dashboard/Replenishment';
import SyncStatus from './Dashboard/SyncStatus';
import StockDonorEdit from './StockDonor/StockDonorEdit';
import * as stockDonor from './StockDonor/StockDonorColumn';
import * as aggregateAmc from './AggregateAmc/AggregateAmcColumn';

const ReplenishmentAndSyncStatus: Plugins = {
  inboundShipmentAppBar: [ShippingStatus],
  dashboard: [Replenishment, SyncStatus],
  stockEditForm: [StockDonorEdit],
  stockColumn: {
    StateLoader: [stockDonor.StateLoader],
    columns: [stockDonor.StockDonorColumn],
  },
  requestRequisitionColumn: {
    StateLoader: [aggregateAmc.StateLoader],
    columns: [aggregateAmc.AggregateAmcColumn],
  },
};

export default ReplenishmentAndSyncStatus;
