import { Plugins } from '@openmsupply-client/common';
import Replenishment from './Replenishment';
import SyncStatus from './SyncStatus';

const ReplenishmentAndSyncStatus: Plugins = {
  dashboard: [Replenishment, SyncStatus],
};

export default ReplenishmentAndSyncStatus;
