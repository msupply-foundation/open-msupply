import { Sync } from './sync';
import { Utils } from './utils';
import { Settings } from './settings';

export const useHost = {
  settings: {
    displaySettings: Settings.useDisplaySettings,
    syncSettings: Settings.useSyncSettings,
    updateDisplaySettings: Settings.useUpdateDisplaySettings,
  },
  sync: {
    initialise: Sync.useInitialiseSite,
    manualSync: Sync.useManualSync,
    update: Sync.useUpdateSyncSettings,
  },
  utils: {
    syncStatus: Utils.useSyncStatus,
    syncInfo: Utils.useSyncInfo,
    initialisationStatus: Utils.useInitialisationStatus,
  },
};
