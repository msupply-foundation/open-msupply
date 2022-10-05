import { Sync } from './sync';
import { Utils } from './utils';

export const useHost = {
  sync: {
    initialise: Sync.useInitialiseSite,
    manualSync: Sync.useManualSync,
    update: Sync.useUpdateSyncSettings,
  },
  utils: {
    syncStatus: Utils.useSyncStatus,
    syncInfo: Utils.useSyncInfo,
    syncSettings: Utils.useSyncSettings,
    initialisationStatus: Utils.useInitialisationStatus,
  },
};
