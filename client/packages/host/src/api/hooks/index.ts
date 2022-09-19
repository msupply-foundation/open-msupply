import { Sync } from './sync';
import { Utils } from './utils';

export const useHost = {
  sync: {
    update: Sync.useSyncSettingsUpdate,
  },
  utils: {
    restart: Utils.useServerRestart,
    settings: Utils.useServerSettings,
  },
};
