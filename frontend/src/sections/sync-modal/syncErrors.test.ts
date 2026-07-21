import { describe, expect, it } from 'vitest';
import { syncErrorSummary } from './syncErrors';
import type { SyncErrorVariant } from './syncStatus';

// The expected summary key per variant, transcribed INDEPENDENTLY from the
// contract's error-summary table (spec/sync-modal/contract.md § error
// summaries). Typing it Record<SyncErrorVariant, string> also fails compilation
// if the generated variant union gains or loses a member — so this doubles as
// the exhaustiveness guard for AC-E1.
const EXPECTED: Record<SyncErrorVariant, string> = {
  // cannot connect
  CONNECTION_ERROR: 'error.connection-error',
  // invalid URL
  INVALID_URL: 'error.invalid-url',
  // incorrect name/password
  INCORRECT_PASSWORD: 'error.site-incorrect-password',
  INVALID_SITE_NAME_OR_PASSWORD: 'error.site-incorrect-password',
  // site name not found
  SITE_NAME_NOT_FOUND: 'error.site-name-not-found',
  // site auth timed out
  SITE_AUTH_TIMEOUT: 'error.site-auth-timeout',
  AUTHENTICATION: 'error.site-auth-timeout',
  REQUEST_SITE_AUTH_ERROR: 'error.site-auth-timeout',
  // site already registered
  TOKEN_ALREADY_ALLOCATED: 'error.token-already-allocated',
  // site mismatch
  SITE_UUID_IS_BEING_CHANGED: 'error.site-mismatch',
  // incorrect hardware id
  HARDWARE_ID_MISMATCH: 'error.site-incorrect-hardware-id',
  // site has no store
  SITE_HAS_NO_STORE: 'error.site-has-no-store',
  // sync API incompatible
  API_VERSION_INCOMPATIBLE: 'error.sync-api-incompatible',
  SYNC_VERSION_MISMATCH: 'error.sync-api-incompatible',
  // v6 API incompatible
  V6_API_VERSION_INCOMPATIBLE: 'error.sync-v6-api-incompatible',
  // v6 central not configured
  CENTRAL_V6_NOT_CONFIGURED: 'error.v6-server-not-configured',
  NOT_A_CENTRAL_SERVER: 'error.v6-server-not-configured',
  // v7 upgrade failed
  V7_UPGRADE_FAILED: 'error.v7-upgrade-failed',
  // site not on v7 yet
  SITE_IS_NOT_V7: 'error.site-is-not-v7',
  // waiting for central upgrade
  WAITING_FOR_CENTRAL_V7_UPGRADE: 'error.waiting-for-central-v7-upgrade',
  // integration timed out
  INTEGRATION_TIMEOUT_REACHED: 'error.integration-timeout-reached',
  // server problem (internal)
  INTEGRATION_ERROR: 'error.internal-error',
  DATABASE_ERROR: 'error.internal-error',
  SYNC_RECORD_SERIALIZE_ERROR: 'error.internal-error',
  RECORD_NOT_FOUND: 'error.internal-error',
  TOKEN_NOT_FOUND: 'error.internal-error',
  FAILED_TO_GET_HARDWARE_ID: 'error.internal-error',
  MISSING_AUTH_HEADER: 'error.internal-error',
  SITE_LOCK_ERROR: 'error.internal-error',
  PARSING_ERROR: 'error.internal-error',
  SITE_ID_NOT_SET: 'error.internal-error',
  GET_CURRENT_SITE_ID_ERROR: 'error.internal-error',
  SITE_ID_MISMATCH: 'error.internal-error',
  // unknown (fallback)
  UNKNOWN: 'error.unknown-sync-error',
  OTHER: 'error.unknown-sync-error',
};

// Kinds that carry a guidance hint (the spec table's Hint column).
const HINTED = new Set([
  'error.connection-error',
  'error.sync-api-incompatible',
  'error.sync-v6-api-incompatible',
  'error.v6-server-not-configured',
  'error.v7-upgrade-failed',
]);

const variants = Object.keys(EXPECTED) as SyncErrorVariant[];

describe('syncErrorSummary — variant → kind mapping (AC-E1)', () => {
  it('maps every variant to its kind’s captured summary', () => {
    for (const variant of variants) {
      expect(syncErrorSummary(variant).summary).toBe(EXPECTED[variant]);
    }
  });

  it('is one distinct summary per kind — not a single generic message', () => {
    const distinct = new Set(variants.map(v => syncErrorSummary(v).summary));
    expect(distinct.size).toBe(18);
  });

  it('carries a hint only for the kinds with a known remedy', () => {
    for (const variant of variants) {
      const { summary, hint } = syncErrorSummary(variant);
      if (HINTED.has(summary)) expect(hint).toBeDefined();
      else expect(hint).toBeUndefined();
    }
  });

  it('falls back to the unknown summary for a missing or unrecognised variant', () => {
    expect(syncErrorSummary(undefined).summary).toBe(
      'error.unknown-sync-error'
    );
    expect(syncErrorSummary(undefined).hint).toBeUndefined();
    // A variant newer than the pinned schema (the wire can outrun codegen).
    expect(
      syncErrorSummary('A_BRAND_NEW_VARIANT' as SyncErrorVariant).summary
    ).toBe('error.unknown-sync-error');
  });
});
