// Synchronisation form logic (spec/settings/rules.md § Synchronisation), pure
// for the unit tests: the all-four-filled Save gate (AC-SY1), the
// always-blank password seed (AC-SY2), the positive-whole-second interval
// normalisation, and the failure-message resolution (AC-SY3's reason-specific
// message with the unstructured-failure fallback).

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
};

// Seed from stored settings — url/site/interval pre-fill, the password NEVER
// does (AC-SY2): the server stores only a hash and the query cannot return it.
export const initialSyncForm = (
  stored: SyncSettingsResult['syncSettings']
): SyncFormState => ({
  url: stored?.url ?? '',
  username: stored?.username ?? '',
  password: '',
  intervalSeconds: stored?.intervalSeconds,
});

// Save stays disabled until every one of the four fields has a value (AC-SY1).
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

export const buildSyncInput = (
  form: SyncFormState
): UpdateSyncSettingsVariables['input'] => ({
  url: form.url.trim(),
  username: form.username.trim(),
  password: form.password,
  intervalSeconds: normaliseInterval(form.intervalSeconds ?? 1),
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
