// spec/sync-modal/contract.md § error summaries — every error variant maps to
// its kind's localised summary (and, for kinds with a known remedy, a short
// guidance hint), with the full detail available for support. The exhaustive
// Record<SyncErrorVariant, …> makes a new schema variant a compile error here
// rather than a silent generic message (kdd/type-safety); one distinct summary
// per kind (AC-E1), with `unknown` the runtime fallback for variants newer than
// the pinned schema. The strings ship in the substrate catalogs under the
// current app's error.* keys (the spec's captured strings live there).

import type { LocaleKey } from '../../intl';
import type { SyncErrorVariant } from './syncStatus';

export type SyncErrorSummary = { summary: LocaleKey; hint?: LocaleKey };

const CONNECTION: SyncErrorSummary = {
  summary: 'error.connection-error',
  // The current app hints only on the v7 connection error; the merged variant
  // map applies it to both generations — the guidance is right in either.
  hint: 'error.connection-error-hint',
};
const PASSWORD: SyncErrorSummary = { summary: 'error.site-incorrect-password' };
const AUTH_TIMEOUT: SyncErrorSummary = { summary: 'error.site-auth-timeout' };
const API_INCOMPATIBLE: SyncErrorSummary = {
  summary: 'error.sync-api-incompatible',
  hint: 'error.sync-api-incompatible-hint',
};
const V6_NOT_CONFIGURED: SyncErrorSummary = {
  summary: 'error.v6-server-not-configured',
  hint: 'error.v6-server-not-configured-hint',
};
const INTEGRATION_TIMEOUT: SyncErrorSummary = {
  summary: 'error.integration-timeout-reached',
};
const INTERNAL: SyncErrorSummary = { summary: 'error.internal-error' };
const UNKNOWN: SyncErrorSummary = { summary: 'error.unknown-sync-error' };

const SUMMARY_BY_VARIANT: Record<SyncErrorVariant, SyncErrorSummary> = {
  // Cannot reach the central server / bad address.
  CONNECTION_ERROR: CONNECTION,
  INVALID_URL: { summary: 'error.invalid-url' },
  // Site credentials / registration.
  INCORRECT_PASSWORD: PASSWORD,
  INVALID_SITE_NAME_OR_PASSWORD: PASSWORD,
  SITE_NAME_NOT_FOUND: { summary: 'error.site-name-not-found' },
  SITE_AUTH_TIMEOUT: AUTH_TIMEOUT,
  AUTHENTICATION: AUTH_TIMEOUT,
  REQUEST_SITE_AUTH_ERROR: AUTH_TIMEOUT,
  TOKEN_ALREADY_ALLOCATED: { summary: 'error.token-already-allocated' },
  // Site identity / configuration.
  SITE_UUID_IS_BEING_CHANGED: { summary: 'error.site-mismatch' },
  HARDWARE_ID_MISMATCH: { summary: 'error.site-incorrect-hardware-id' },
  SITE_HAS_NO_STORE: { summary: 'error.site-has-no-store' },
  // Version / protocol mismatches between site and central.
  API_VERSION_INCOMPATIBLE: API_INCOMPATIBLE,
  SYNC_VERSION_MISMATCH: API_INCOMPATIBLE,
  V6_API_VERSION_INCOMPATIBLE: {
    summary: 'error.sync-v6-api-incompatible',
    hint: 'error.sync-v6-api-incompatible-hint',
  },
  CENTRAL_V6_NOT_CONFIGURED: V6_NOT_CONFIGURED,
  NOT_A_CENTRAL_SERVER: V6_NOT_CONFIGURED,
  V7_UPGRADE_FAILED: {
    summary: 'error.v7-upgrade-failed',
    hint: 'error.v7-upgrade-failed-hint',
  },
  SITE_IS_NOT_V7: { summary: 'error.site-is-not-v7' },
  WAITING_FOR_CENTRAL_V7_UPGRADE: {
    summary: 'error.waiting-for-central-v7-upgrade',
  },
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

// The fallback also covers a variant value newer than the pinned schema — the
// wire can outrun the generated union at runtime.
export const syncErrorSummary = (
  variant: SyncErrorVariant | undefined
): SyncErrorSummary => (variant && SUMMARY_BY_VARIANT[variant]) || UNKNOWN;
