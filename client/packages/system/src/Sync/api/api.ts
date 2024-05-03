import {
  LocaleKey,
  TypedTFunction,
  SyncSettingsInput,
  ErrorWithDetailsProps,
  SyncErrorVariant,
} from '@openmsupply-client/common';

import { Sdk, SyncErrorFragment } from './operations.generated';

export const getSyncQueries = (sdk: Sdk) => ({
  get: {
    syncSettings: async () => {
      const result = await sdk.syncSettings();
      return result.syncSettings;
    },
    syncStatus: async () => {
      const result = await sdk.syncStatus();
      return result?.syncStatus;
    },
    syncInfo: (token?: string) =>
      sdk.syncInfo({}, { Authorization: `Bearer ${token}` }),
  },
  // manualSync is a trigger that returns a string result (don't need to capture it)
  manualSync: async () => sdk.manualSync(),
  initialise: async (settings: SyncSettingsInput) => {
    const result = await sdk.initialiseSite({
      syncSettings: cleanSyncSettings(settings),
    });
    return result.initialiseSite;
  },
  update: async (settings: SyncSettingsInput) => {
    const result = await sdk.updateSyncSettings({
      syncSettings: cleanSyncSettings(settings),
    });
    return result?.updateSyncSettings;
  },
  lastSuccessfulUserSync: async () => {
    return (await sdk.lastSuccessfulUserSync()).lastSuccessfulUserSync
      .lastSuccessfulSync;
  },
  updateUser: async () => {
    const result = await sdk.updateUser();

    return result.updateUser;
  },
});

// In typescript it's allowed to have excess properties on object
// to avoid errors thrown in mutation, we should remove any excess properties for input
function cleanSyncSettings({
  username,
  password,
  url,
  intervalSeconds,
}: SyncSettingsInput): SyncSettingsInput {
  return { username, password, url, intervalSeconds };
}

export function mapSyncError(
  t: TypedTFunction<LocaleKey>,
  error: SyncErrorFragment,
  defaultKey?: LocaleKey
): ErrorWithDetailsProps {
  const errorMapping: { [key in SyncErrorVariant]: LocaleKey } = {
    [SyncErrorVariant.ConnectionError]: 'error.connection-error',
    [SyncErrorVariant.SiteUuidIsBeingChanged]: 'error.site-mismatch',
    [SyncErrorVariant.HardwareIdMismatch]: 'error.site-incorrect-hardware-id',
    [SyncErrorVariant.IncorrectPassword]: 'error.site-incorrect-password',
    [SyncErrorVariant.SiteAuthTimeout]: 'error.site-auth-timeout',
    [SyncErrorVariant.SiteHasNoStore]: 'error.site-has-no-store',
    [SyncErrorVariant.SiteNameNotFound]: 'error.site-name-not-found',
    [SyncErrorVariant.IntegrationTimeoutReached]:
      'error.integration-timeout-reached',
    [SyncErrorVariant.InvalidUrl]: 'error.invalid-url',
    [SyncErrorVariant.ApiVersionIncompatible]: 'error.sync-api-incompatible',
    [SyncErrorVariant.CentralV6NotConfigured]: 'error.v6-server-not-configured',
    [SyncErrorVariant.IntegrationError]: 'error.internal-error',
    [SyncErrorVariant.Unknown]: defaultKey || 'error.unknown-sync-error',
  };

  return {
    error:
      t(errorMapping[error.variant]) ||
      defaultKey ||
      'error.unknown-sync-error',
    details: error.fullError,
  };
}
