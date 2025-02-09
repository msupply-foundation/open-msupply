import { Plugins } from '@openmsupply-client/common';
import ShippingStatus from './ShippingStatus/ShippingStatus';
import Replenishment from './Dashboard/Replenishment';
import SyncStatus from './Dashboard/SyncStatus';
import StockDonorEdit from './StockDonor/StockDonorEdit';
import { StateLoader, StockDonorColumn } from './StockDonor/StockDonorColumn';

const ReplenishmentAndSyncStatus: Plugins = {
  inboundShipmentAppBar: [ShippingStatus],
  dashboard: [Replenishment, SyncStatus],
  stockEditForm: [StockDonorEdit],
  stockColumn: { StateLoader: [StateLoader], columns: [StockDonorColumn] },
};

export default ReplenishmentAndSyncStatus;
