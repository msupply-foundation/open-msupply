// Synchronisation form logic (spec/settings/rules.md § Synchronisation), pure
// for the unit tests: the all-four-filled Save gate (OMS-REG-SET-02.7/.8), the
// always-blank password seed (OMS-REG-SET-02.12), the positive-whole-second
// interval normalisation, and the failure-message resolution
// (OMS-REG-SET-02.9's reason-specific message with the unstructured-failure
// fallback).

import type { LocaleKey } from '../../../intl';
import { syncErrorSummary } from '../../sync-modal/syncErrors';
import type {
  SyncSettingsResult,
  UpdateSyncSettingsResult,
  UpdateSyncSettingsVariables,
} from './syncSettings.generated';

export type SyncFormState = {
  url: string;
  username: string;
  password: string;
  intervalSeconds: number | undefined;
  /** Optional override; `undefined` = empty = the server's own default. */
  batchSize: number | undefined;
};

// Seed from stored settings — url/site/interval/batch size pre-fill, the
// password NEVER does (OMS-REG-SET-02.12): the server stores only a hash and
// the query cannot return it. `batchSize` answers null for a site running the
// server defaults (and for legacy non-uniform values — see contract
// § Synchronisation), which is the empty field (OMS-REG-SET-02.16).
export const initialSyncForm = (
  stored: SyncSettingsResult['syncSettings']
): SyncFormState => ({
  url: stored?.url ?? '',
  username: stored?.username ?? '',
  password: '',
  intervalSeconds: stored?.intervalSeconds,
  batchSize: stored?.batchSize ?? undefined,
});

// Save stays disabled until every one of the four REQUIRED fields has a value
// (OMS-REG-SET-02.7/.8). The batch size is optional and never gates Save
// (OMS-REG-SET-02.15).
export const canSaveSyncSettings = (form: SyncFormState): boolean =>
  form.url.trim() !== '' &&
  form.username.trim() !== '' &&
  form.password !== '' &&
  form.intervalSeconds != null &&
  form.intervalSeconds > 0;

// The interval must be a positive whole number — rounded and floored to at
// least one second before it can be sent (rules § Synchronisation).
export const normaliseInterval = (seconds: number): number =>
  Math.max(1, Math.floor(seconds));

// The batch size is a positive whole number or nothing at all: an empty field —
// or anything the field could still hold that isn't positive — is sent as null,
// which the server reads as "use my defaults" (rules § Synchronisation). A zero
// would be rejected server-side, so it never leaves as one.
export const normaliseBatchSize = (size: number | undefined): number | null => {
  if (size == null) return null;
  const whole = Math.round(size);
  return whole > 0 ? whole : null;
};

export const buildSyncInput = (
  form: SyncFormState
): UpdateSyncSettingsVariables['input'] => ({
  url: form.url.trim(),
  username: form.username.trim(),
  password: form.password,
  intervalSeconds: normaliseInterval(form.intervalSeconds ?? 1),
  batchSize: normaliseBatchSize(form.batchSize),
});

type UpdateResponse = UpdateSyncSettingsResult['updateSyncSettings'];

// A failed save shows the reason resolved from the returned sync error
// variant — the same variant→summary table the sync vertical owns
// (spec/settings/ui-surface.md § Synchronisation cites the sync-modal
// mapping); anything unstructured falls back to
// `error.unable-to-save-settings`.
export const syncSaveErrorKey = (
  response: Extract<
    UpdateResponse,
    { __typename: 'SyncErrorNode' | 'SyncErrorV7Node' }
  >
): LocaleKey =>
  syncErrorSummary(
    response.__typename === 'SyncErrorNode'
      ? response.variant
      : response.variantV7
  ).summary;

export const SYNC_SAVE_FALLBACK_ERROR: LocaleKey =
  'error.unable-to-save-settings';
