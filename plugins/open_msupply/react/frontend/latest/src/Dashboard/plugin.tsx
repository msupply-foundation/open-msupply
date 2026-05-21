import { Plugins } from '@openmsupply-client/common';
import Replenishment from './Replenishment';
import SyncStatus from './SyncStatus';

const ReplenishmentAndSyncStatus: Plugins = {
  dashboard: {
    widget: [{ Component: Replenishment }, { Component: SyncStatus }],
  },
};

export default ReplenishmentAndSyncStatus;
