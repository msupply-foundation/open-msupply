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
  manualSync: async (fetchPatientId?: string) =>
    sdk.manualSync({ fetchPatientId }),
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
    [SyncErrorVariant.V6ApiVersionIncompatible]:
      'error.sync-v6-api-incompatible',
    [SyncErrorVariant.IntegrationError]: 'error.internal-error',
    [SyncErrorVariant.Unknown]: defaultKey || 'error.unknown-sync-error',
  };

  const getHint = () => {
    switch (error.variant) {
      case SyncErrorVariant.ApiVersionIncompatible:
        return t('error.sync-api-incompatible-hint');
      case SyncErrorVariant.CentralV6NotConfigured:
        return t('error.v6-server-not-configured-hint');
      case SyncErrorVariant.V6ApiVersionIncompatible:
        return t('error.sync-v6-api-incompatible-hint');
      default:
        return undefined;
    }
  };

  return {
    error:
      t(errorMapping[error.variant]) ||
      defaultKey ||
      'error.unknown-sync-error',
    details: error.fullError,
    hint: getHint(),
  };
}
