import { Sync } from './sync';
import { Utils } from './utils';

export const useHost = {
  sync: {
    initialise: Sync.useInitialiseSite,
    manualSync: Sync.useManualSync,
  },
  utils: {
    syncStatus: Utils.useSyncStatus,
    syncSettings: Utils.useSyncSettings,
    syncState: Utils.useSyncState,
  },
};
