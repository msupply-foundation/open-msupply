import type { LocaleKey } from '../../intl';
import type { SyncErrorVariant } from './syncStatus';

// Spec (sync-modal › The modal's status display): a failed run's error shows a
// localised summary per error kind — and, for kinds with a known remedy, a
// short guidance hint — with the full detail available for support. The
// variant→kind mapping mirrors the current app's (contract.md § error
// summaries); the exhaustive Record makes a new schema variant a type error
// here rather than a silent unknown (kdd/type-safety).
export type SyncErrorSummary = {
  summary: LocaleKey;
  hint?: LocaleKey;
};

const CONNECTION: SyncErrorSummary = {
  summary: 'sync.error.connection',
  // The current app hints only on the v7 connection error; the merged variant
  // map applies it to both generations — the guidance is right in either.
  hint: 'sync.error.connection-hint',
};
const PASSWORD: SyncErrorSummary = { summary: 'sync.error.password' };
const AUTH_TIMEOUT: SyncErrorSummary = { summary: 'sync.error.auth-timeout' };
const API_INCOMPATIBLE: SyncErrorSummary = {
  summary: 'sync.error.api-incompatible',
  hint: 'sync.error.api-incompatible-hint',
};
const V6_NOT_CONFIGURED: SyncErrorSummary = {
  summary: 'sync.error.v6-not-configured',
  hint: 'sync.error.v6-not-configured-hint',
};
const INTEGRATION_TIMEOUT: SyncErrorSummary = {
  summary: 'sync.error.integration-timeout',
};
const INTERNAL: SyncErrorSummary = { summary: 'sync.error.internal' };
const UNKNOWN: SyncErrorSummary = { summary: 'sync.error.unknown' };

const SUMMARY_BY_VARIANT: Record<SyncErrorVariant, SyncErrorSummary> = {
  // Cannot reach the central server / bad address.
  CONNECTION_ERROR: CONNECTION,
  INVALID_URL: { summary: 'sync.error.invalid-url' },
  // Site credentials / registration.
  INCORRECT_PASSWORD: PASSWORD,
  INVALID_SITE_NAME_OR_PASSWORD: PASSWORD,
  SITE_NAME_NOT_FOUND: { summary: 'sync.error.site-name-not-found' },
  SITE_AUTH_TIMEOUT: AUTH_TIMEOUT,
  AUTHENTICATION: AUTH_TIMEOUT,
  REQUEST_SITE_AUTH_ERROR: AUTH_TIMEOUT,
  TOKEN_ALREADY_ALLOCATED: { summary: 'sync.error.already-registered' },
  // Site identity / configuration.
  SITE_UUID_IS_BEING_CHANGED: { summary: 'sync.error.site-mismatch' },
  HARDWARE_ID_MISMATCH: { summary: 'sync.error.hardware-id' },
  SITE_HAS_NO_STORE: { summary: 'sync.error.no-store' },
  // Version / protocol mismatches between site and central.
  API_VERSION_INCOMPATIBLE: API_INCOMPATIBLE,
  SYNC_VERSION_MISMATCH: API_INCOMPATIBLE,
  V6_API_VERSION_INCOMPATIBLE: {
    summary: 'sync.error.v6-api-incompatible',
    hint: 'sync.error.v6-api-incompatible-hint',
  },
  CENTRAL_V6_NOT_CONFIGURED: V6_NOT_CONFIGURED,
  NOT_A_CENTRAL_SERVER: V6_NOT_CONFIGURED,
  V7_UPGRADE_FAILED: {
    summary: 'sync.error.v7-upgrade-failed',
    hint: 'sync.error.v7-upgrade-failed-hint',
  },
  SITE_IS_NOT_V7: { summary: 'sync.error.not-v7' },
  // Integration.
  INTEGRATION_TIMEOUT_REACHED: INTEGRATION_TIMEOUT,
  // Server-side faults the user can't act on — the app's "internal error".
  INTEGRATION_ERROR: INTERNAL,
  DATABASE_ERROR: INTERNAL,
  SYNC_RECORD_SERIALIZE_ERROR: INTERNAL,
  RECORD_NOT_FOUND: INTERNAL,
  TOKEN_NOT_FOUND: INTERNAL,
  FAILED_TO_GET_HARDWARE_ID: INTERNAL,
  MISSING_AUTH_HEADER: INTERNAL,
  SITE_LOCK_ERROR: INTERNAL,
  PARSING_ERROR: INTERNAL,
  SITE_ID_NOT_SET: INTERNAL,
  GET_CURRENT_SITE_ID_ERROR: INTERNAL,
  SITE_ID_MISMATCH: INTERNAL,
  // Explicit catch-alls.
  UNKNOWN,
  OTHER: UNKNOWN,
};

// The fallback also covers a variant value newer than the pinned schema —
// the wire can outrun the generated union at runtime.
export const syncErrorSummary = (
  variant: SyncErrorVariant | undefined
): SyncErrorSummary => (variant && SUMMARY_BY_VARIANT[variant]) || UNKNOWN;
