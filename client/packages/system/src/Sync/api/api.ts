import {
  LocaleKey,
  TypedTFunction,
  SyncSettingsInput,
  ErrorWithDetailsProps,
  SyncErrorVariant,
  SyncErrorVariantV7,
} from '@openmsupply-client/common';

import {
  Sdk,
  SyncErrorFragment,
  SyncErrorV7Fragment,
  FullSyncStatusV5V6Fragment,
  FullSyncStatusV7Fragment,
} from './operations.generated';

export type SyncStatus = FullSyncStatusV5V6Fragment | FullSyncStatusV7Fragment;
export type SyncErrorAny = SyncErrorFragment | SyncErrorV7Fragment;

/// `latestSyncStatus` is now a union; use this guard to narrow.
export const isSyncStatusV7 = (
  status: SyncStatus | null | undefined
): status is FullSyncStatusV7Fragment =>
  status?.__typename === 'FullSyncStatusV7Node';

export const isSyncErrorV7 = (
  error: SyncErrorAny | null | undefined
): error is SyncErrorV7Fragment =>
  error?.__typename === 'SyncErrorV7Node';

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
  error: SyncErrorAny,
  defaultKey?: LocaleKey
): ErrorWithDetailsProps {
  return isSyncErrorV7(error)
    ? mapSyncErrorV7(t, error, defaultKey)
    : mapSyncErrorV5V6(t, error, defaultKey);
}

function mapSyncErrorV5V6(
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
    [SyncErrorVariant.V7UpgradeFailed]: 'error.v7-upgrade-failed',
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
      case SyncErrorVariant.V7UpgradeFailed:
        return t('error.v7-upgrade-failed-hint');
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

function mapSyncErrorV7(
  t: TypedTFunction<LocaleKey>,
  error: SyncErrorV7Fragment,
  defaultKey?: LocaleKey
): ErrorWithDetailsProps {
  const errorMapping: { [key in SyncErrorVariantV7]: LocaleKey } = {
    [SyncErrorVariantV7.ConnectionError]: 'error.connection-error',
    [SyncErrorVariantV7.HardwareIdMismatch]: 'error.site-incorrect-hardware-id',
    [SyncErrorVariantV7.InvalidSiteNameOrPassword]:
      'error.site-incorrect-password',
    [SyncErrorVariantV7.IntegrationTimeoutReached]:
      'error.integration-timeout-reached',
    [SyncErrorVariantV7.Authentication]: 'error.site-auth-timeout',
    [SyncErrorVariantV7.RequestSiteAuthError]: 'error.site-auth-timeout',
    [SyncErrorVariantV7.SyncVersionMismatch]: 'error.sync-api-incompatible',
    [SyncErrorVariantV7.NotACentralServer]: 'error.v6-server-not-configured',
    [SyncErrorVariantV7.DatabaseError]: 'error.internal-error',
    [SyncErrorVariantV7.SyncRecordSerializeError]: 'error.internal-error',
    [SyncErrorVariantV7.RecordNotFound]: 'error.internal-error',
    [SyncErrorVariantV7.TokenAlreadyAllocated]: 'error.internal-error',
    [SyncErrorVariantV7.TokenNotFound]: 'error.internal-error',
    [SyncErrorVariantV7.FailedToGetHardwareId]: 'error.internal-error',
    [SyncErrorVariantV7.MissingAuthHeader]: 'error.internal-error',
    [SyncErrorVariantV7.SiteLockError]: 'error.internal-error',
    [SyncErrorVariantV7.ParsingError]: 'error.internal-error',
    [SyncErrorVariantV7.SiteIdNotSet]: 'error.internal-error',
    [SyncErrorVariantV7.GetCurrentSiteIdError]: 'error.internal-error',
    [SyncErrorVariantV7.SiteIdMismatch]: 'error.internal-error',
    [SyncErrorVariantV7.SiteIsNotV7]: 'error.site-is-not-v7',
    [SyncErrorVariantV7.Other]: defaultKey || 'error.unknown-sync-error',
  };

  return {
    error:
      t(errorMapping[error.variantV7]) ||
      defaultKey ||
      'error.unknown-sync-error',
    details: error.fullError,
  };
}

/// Identify connection errors regardless of which sync variant produced them.
export const isSyncConnectionError = (
  error: SyncErrorAny | null | undefined
): boolean => {
  if (!error) return false;
  return isSyncErrorV7(error)
    ? error.variantV7 === SyncErrorVariantV7.ConnectionError
    : error.variant === SyncErrorVariant.ConnectionError;
};
