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
    updateUser: Sync.useUpdateUser,
  },
  utils: {
    syncStatus: Utils.useSyncStatus,
    mutateSyncStatus: Utils.useMutateSyncStatus,
    syncInfo: Utils.useSyncInfo,
    lastSuccessfulUserSync: Utils.useLastSuccessfulUserSync,
  },
};
