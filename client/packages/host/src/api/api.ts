import {
  LocaleKey,
  TypedTFunction,
  SyncSettingsInput,
  ErrorWithDetailsProps,
  SyncErrorVariant,
} from '@openmsupply-client/common';

import { Sdk, SyncErrorsFragment } from './operations.generated';

export const getHostQueries = (sdk: Sdk) => ({
  get: {
    syncSettings: async () => {
      const result = await sdk.syncSettings();
      return result.syncSettings;
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
  error: SyncErrorsFragment,
  defaultKey?: LocaleKey
): ErrorWithDetailsProps {
  if (error.__typename === 'UnknownSyncError') {
    return {
      error: defaultKey ? t(defaultKey) : t('error.unknown-sync-error'),
      details: error.fullError,
    };
  }

  const errorMapping: { [key in SyncErrorVariant]: LocaleKey } = {
    [SyncErrorVariant.ConnectionError]: 'error.connection-error',
    [SyncErrorVariant.SiteUuidIsBeingChanged]:
      'error.site-uuid-is-being-changed',
    [SyncErrorVariant.HardwareIdMismatch]: 'error.site-incorrect-hardware-id',
    [SyncErrorVariant.IncorrectPassword]: 'error.site-incorrect-password',
    [SyncErrorVariant.SiteAuthTimeout]: 'error.site-auth-timeout',
    [SyncErrorVariant.SiteHasNoStore]: 'error.site-has-no-store',
    [SyncErrorVariant.SiteNameNotFound]: 'error.site-name-not-found',
    [SyncErrorVariant.IntegrationTimeoutReached]:
      'error.integration-timeout-reached',
    [SyncErrorVariant.InvalidUrl]: 'error.invalid-url',
  };

  return {
    error: t(errorMapping[error.errorVariant]),
    details: error.fullError,
  };
}
