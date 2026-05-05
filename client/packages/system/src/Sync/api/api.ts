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
} from './operations.generated';

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
    syncStatusV7: async () => {
      const result = await sdk.syncStatusV7();
      return result?.syncStatus;
    },
    syncInfoV7: (token?: string) =>
      sdk.syncInfoV7({}, { Authorization: `Bearer ${token}` }),
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

export function mapSyncErrorV5V6(
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

export function mapSyncErrorV7(
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
    [SyncErrorVariantV7.NotACentralServer]: 'error.v6-server-not-configured',
    [SyncErrorVariantV7.SyncVersionMismatch]: 'error.sync-api-incompatible',
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
    [SyncErrorVariantV7.SiteIdMismatch]: 'error.site-mismatch',
    [SyncErrorVariantV7.Other]: defaultKey || 'error.unknown-sync-error',
  };

  return {
    error:
      t(errorMapping[error.variant]) ||
      defaultKey ||
      'error.unknown-sync-error',
    details: error.fullError,
  };
}

/**
 * Role-aware error mapper: dispatches by `__typename` so callers don't have
 * to branch on server role to translate an error. Accepts either V5/V6 or V7
 * sync error shape. For typed access to one variant, import
 * `mapSyncErrorV5V6` or `mapSyncErrorV7` directly.
 */
export function mapSyncError(
  t: TypedTFunction<LocaleKey>,
  error: SyncErrorFragment | SyncErrorV7Fragment,
  defaultKey?: LocaleKey
): ErrorWithDetailsProps {
  if (error.__typename === 'SyncErrorV7Node') {
    return mapSyncErrorV7(t, error, defaultKey);
  }
  return mapSyncErrorV5V6(t, error, defaultKey);
}

/** Detects connection-style errors across V5 and V7 variants. */
export function isSyncConnectionError(
  error: SyncErrorFragment | SyncErrorV7Fragment
): boolean {
  return (
    (error.__typename === 'SyncErrorV7Node' &&
      error.variant === SyncErrorVariantV7.ConnectionError) ||
    (error.__typename === 'SyncErrorNode' &&
      error.variant === SyncErrorVariant.ConnectionError)
  );
}
