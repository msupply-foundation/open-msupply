import { Sync } from './sync';
import { Utils } from './utils';

export const useHost = {
  sync: {
    update: Sync.useSyncSettingsUpdate,
  },
  utils: {
    settings: Utils.useServerSettings,
    version: Utils.useHostVersion,
  },
};
