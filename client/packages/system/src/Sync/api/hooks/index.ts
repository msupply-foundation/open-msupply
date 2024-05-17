import { Sync } from './sync';
import { Utils } from './utils';
import { Settings } from './settings';

export const useSync = {
  settings: {
    syncSettings: Settings.useSyncSettings,
  },
  sync: {
    initialise: Sync.useInitialiseSite,
    manualSync: Sync.useManualSync,
    update: Sync.useUpdateSyncSettings,
  },
  utils: {
    syncStatus: Utils.useSyncStatus,
    mutateSyncStatus: Utils.useMutateSyncStatus,
    syncInfo: Utils.useSyncInfo,
  },
};
