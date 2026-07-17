import { describe, expect, it } from 'vitest';
import type { SyncStatusFragment } from '../../api/initialisation.generated';
import {
  statusLineKind,
  syncDurationParts,
  toSyncOverview,
} from './syncStatus';
import { syncErrorSummary } from './syncErrors';

type V7 = Extract<SyncStatusFragment, { __typename: 'FullSyncStatusV7Node' }>;
type V5V6 = Extract<
  SyncStatusFragment,
  { __typename: 'FullSyncStatusV5V6Node' }
>;

const v7 = (overrides: Partial<V7> = {}): SyncStatusFragment => ({
  __typename: 'FullSyncStatusV7Node',
  isSyncing: false,
  warningThreshold: 1,
  errorThreshold: 3,
  error: null,
  push: null,
  waitingForIntegration: null,
  pull: null,
  integration: null,
  lastSuccessfulSync: null,
  ...overrides,
});

const v5v6 = (overrides: Partial<V5V6> = {}): SyncStatusFragment => ({
  __typename: 'FullSyncStatusV5V6Node',
  isSyncing: false,
  warningThreshold: 1,
  errorThreshold: 3,
  error: null,
  prepareInitial: null,
  push: null,
  pushV6: null,
  pullCentral: null,
  pullRemote: null,
  pullV6: null,
  integration: null,
  lastSuccessfulSync: null,
  ...overrides,
});

const MODAL_REMOTE = { operational: true, centralServer: false };
const MODAL_CENTRAL = { operational: true, centralServer: true };
const INIT_REMOTE = { operational: false, centralServer: false };
const INIT_CENTRAL = { operational: false, centralServer: true };

const part = {
  started: '2026-01-01T00:00:00Z',
  finished: null,
  done: 5,
  total: 10,
};

describe('toSyncOverview', () => {
  it('is undefined without a status', () => {
    expect(toSyncOverview(null, MODAL_REMOTE)).toBeUndefined();
  });

  // AC-S2: the phase list shows the generation's phases in execution order.
  it('AC-S2: v7 phases in execution order — push, waiting, pull, integrate', () => {
    const overview = toSyncOverview(v7(), MODAL_REMOTE);
    expect(overview?.steps.map(s => s.label)).toEqual([
      'sync.step.push',
      'sync.step.waiting-for-integration',
      'sync.step.pull',
      'sync.step.integration',
    ]);
  });

  it('AC-S5: legacy modal phases on a remote site', () => {
    const overview = toSyncOverview(v5v6(), MODAL_REMOTE);
    expect(overview?.steps.map(s => s.label)).toEqual([
      'sync.step.push-v6',
      'sync.step.push',
      'sync.step.pull-central',
      'sync.step.pull-remote',
      'sync.step.pull-v6',
      'sync.step.integration',
    ]);
  });

  it('AC-S5: legacy modal phases on a central server', () => {
    const overview = toSyncOverview(v5v6(), MODAL_CENTRAL);
    expect(overview?.steps.map(s => s.label)).toEqual([
      'sync.step.push',
      'sync.step.pull-central',
      'sync.step.pull-remote',
      'sync.step.integration',
    ]);
  });

  it('AC-S5: legacy initialisation phases (remote and central)', () => {
    expect(
      toSyncOverview(v5v6(), INIT_REMOTE)?.steps.map(s => s.label)
    ).toEqual([
      'sync.step.prepare-initial',
      'sync.step.pull-central',
      'sync.step.pull-remote',
      'sync.step.pull-v6',
      'sync.step.integration',
    ]);
    expect(
      toSyncOverview(v5v6(), INIT_CENTRAL)?.steps.map(s => s.label)
    ).toEqual([
      'sync.step.prepare-initial',
      'sync.step.pull-central',
      'sync.step.pull-remote',
      'sync.step.integration',
    ]);
  });

  it('AC-S5: v7 initialisation shows pull and integrate only', () => {
    expect(toSyncOverview(v7(), INIT_REMOTE)?.steps.map(s => s.label)).toEqual([
      'sync.step.pull',
      'sync.step.integration',
    ]);
  });

  it('AC-S2: an in-progress step carries its done/total counts', () => {
    const overview = toSyncOverview(
      v7({ isSyncing: true, pull: part }),
      MODAL_REMOTE
    );
    const pull = overview?.steps.find(s => s.label === 'sync.step.pull');
    expect(pull).toMatchObject({
      started: true,
      finished: false,
      done: 5,
      total: 10,
    });
  });

  it('AC-S2: a phase with nothing to process (total 0) carries no count', () => {
    const overview = toSyncOverview(
      v7({ isSyncing: true, push: { ...part, done: 0, total: 0 } }),
      MODAL_REMOTE
    );
    const push = overview?.steps.find(s => s.label === 'sync.step.push');
    expect(push).toMatchObject({ started: true });
    expect(push?.done).toBeUndefined();
    expect(push?.total).toBeUndefined();
  });

  it('AC-S2: a known total with no done yet reads as 0 / N', () => {
    const overview = toSyncOverview(
      v7({ isSyncing: true, pull: { ...part, done: null, total: 10 } }),
      MODAL_REMOTE
    );
    const pull = overview?.steps.find(s => s.label === 'sync.step.pull');
    expect(pull).toMatchObject({ done: 0, total: 10 });
  });

  // AC-E1: a failed run exposes its error kind and full detail.
  it('AC-E1: the error carries the variant (per generation) and full detail', () => {
    const v7Error = toSyncOverview(
      v7({ error: { variantV7: 'CONNECTION_ERROR', fullError: 'boom' } }),
      MODAL_REMOTE
    )?.error;
    expect(v7Error).toEqual({ variant: 'CONNECTION_ERROR', fullError: 'boom' });

    const legacyError = toSyncOverview(
      v5v6({ error: { variant: 'INCORRECT_PASSWORD', fullError: 'nope' } }),
      MODAL_REMOTE
    )?.error;
    expect(legacyError).toEqual({
      variant: 'INCORRECT_PASSWORD',
      fullError: 'nope',
    });
  });

  // AC-E2: a failed latest run leaves the last-successful record intact.
  it('AC-E2: last successful survives a failed latest run', () => {
    const overview = toSyncOverview(
      v7({
        error: { variantV7: 'CONNECTION_ERROR', fullError: 'x' },
        lastSuccessfulSync: {
          started: '2026-01-01T00:00:00Z',
          finished: '2026-01-01T00:00:05Z',
        },
      }),
      MODAL_REMOTE
    );
    expect(overview?.lastSuccessful).toEqual({
      started: '2026-01-01T00:00:00Z',
      finished: '2026-01-01T00:00:05Z',
    });
    expect(overview?.succeeded).toBe(false);
  });
});

describe('statusLineKind', () => {
  // AC-S1: exactly one status line, by precedence.
  it('AC-S1: waiting before any status arrives', () => {
    expect(statusLineKind(undefined, undefined)).toBe('waiting');
  });

  it('AC-S1: syncing wins over a non-zero count', () => {
    const overview = toSyncOverview(v7({ isSyncing: true }), MODAL_REMOTE);
    expect(statusLineKind(overview, 5000)).toBe('syncing');
  });

  it('AC-S1: a non-zero count wins over nothing-to-push', () => {
    const overview = toSyncOverview(v7(), MODAL_REMOTE);
    expect(statusLineKind(overview, 3)).toBe('records-to-push');
    expect(statusLineKind(overview, 0)).toBe('nothing-to-push');
    expect(statusLineKind(overview, undefined)).toBe('nothing-to-push');
  });
});

describe('syncDurationParts', () => {
  const at = (s: number) => new Date(s * 1000).toISOString();

  // AC-S3: exact non-zero hours and minutes plus seconds — never approximated.
  it('AC-S3: decomposes exactly, sub-minute runs keeping their seconds', () => {
    expect(syncDurationParts(at(0), at(0))).toEqual({
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
    expect(syncDurationParts(at(0), at(1))).toEqual({
      hours: 0,
      minutes: 0,
      seconds: 1,
    });
    expect(syncDurationParts(at(0), at(65))).toEqual({
      hours: 0,
      minutes: 1,
      seconds: 5,
    });
    expect(syncDurationParts(at(0), at(3661))).toEqual({
      hours: 1,
      minutes: 1,
      seconds: 1,
    });
    // A clock skew can't produce a negative duration.
    expect(syncDurationParts(at(10), at(5))).toEqual({
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });
});

describe('syncErrorSummary', () => {
  // AC-E1: the summary is localised per error kind — mirroring the current
  // app's variant mapping — with an unknown fallback; remedy kinds carry a
  // hint.
  it('AC-E1: maps variants per kind and falls back to unknown', () => {
    expect(syncErrorSummary('CONNECTION_ERROR')).toEqual({
      summary: 'sync.error.connection',
      hint: 'sync.error.connection-hint',
    });
    expect(syncErrorSummary('INVALID_SITE_NAME_OR_PASSWORD').summary).toBe(
      'sync.error.password'
    );
    expect(syncErrorSummary('SYNC_VERSION_MISMATCH')).toEqual({
      summary: 'sync.error.api-incompatible',
      hint: 'sync.error.api-incompatible-hint',
    });
    expect(syncErrorSummary('INTEGRATION_TIMEOUT_REACHED')).toEqual({
      summary: 'sync.error.integration-timeout',
    });
    expect(syncErrorSummary('HARDWARE_ID_MISMATCH').summary).toBe(
      'sync.error.hardware-id'
    );
    // Server faults the user can't act on read as the internal error — the
    // current app's grouping, including the v5/v6 integration failure.
    expect(syncErrorSummary('INTEGRATION_ERROR').summary).toBe(
      'sync.error.internal'
    );
    expect(syncErrorSummary('DATABASE_ERROR').summary).toBe(
      'sync.error.internal'
    );
    expect(syncErrorSummary('OTHER').summary).toBe('sync.error.unknown');
    expect(syncErrorSummary(undefined).summary).toBe('sync.error.unknown');
  });
});
