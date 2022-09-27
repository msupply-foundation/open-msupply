import { SyncSettingsInput } from '@common/types';
import { Sdk } from './operations.generated';

export const getHostQueries = (sdk: Sdk) => ({
  get: {
    syncSettings: async () => {
      const result = await sdk.syncSettings();
      return result?.syncSettings;
    },
    initialisationStatus: async () => {
      const result = await sdk.initialisationStatus();
      return result?.initialisationStatus;
    },
    syncStatus: async () => {
      const result = await sdk.syncStatus();
      return result?.latestSyncStatus;
    },
  },
  // manaulSync is a trigger that returns a string result (don't need to caputre it)
  manualSync: async () => {
    return await sdk.manualSync();
  },
  initialise: async (settings: SyncSettingsInput) => {
    const result = await sdk.initialiseSite({
      syncSettings: settings,
    });
    return result?.initialiseSite;
  },
});
