import { describe, expect, it } from 'vitest';
import type { SyncStatusFragment } from '../api/initialisation.generated';
import { toSyncOverview } from './syncStatus';

const v7 = (
  overrides: Partial<
    Extract<SyncStatusFragment, { __typename: 'FullSyncStatusV7Node' }>
  >
): SyncStatusFragment => ({
  __typename: 'FullSyncStatusV7Node',
  isSyncing: false,
  summary: { started: '2026-01-01T00:00:00Z' },
  warningThreshold: 1,
  errorThreshold: 3,
  error: null,
  pull: null,
  push: null,
  waitingForIntegration: null,
  integration: null,
  lastSuccessfulSync: null,
  linkedDescriptions: [],
  ...overrides,
});

const v5v6 = (
  overrides: Partial<
    Extract<SyncStatusFragment, { __typename: 'FullSyncStatusV5V6Node' }>
  >
): SyncStatusFragment => ({
  __typename: 'FullSyncStatusV5V6Node',
  isSyncing: false,
  summary: { started: '2026-01-01T00:00:00Z' },
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

describe('toSyncOverview (initialisation phases)', () => {
  it('is undefined without a status', () => {
    expect(toSyncOverview(null, false)).toBeUndefined();
  });

  it('v7 initialisation shows pull then integrate — never a push', () => {
    const overview = toSyncOverview(
      v7({
        isSyncing: true,
        pull: {
          started: '2026-01-01T00:00:00Z',
          finished: null,
          done: 5,
          total: 10,
        },
      }),
      false
    );
    expect(overview?.isSyncing).toBe(true);
    expect(overview?.succeeded).toBe(false);
    // Labels are i18n keys; SyncProgress resolves them with t() at render.
    expect(overview?.steps).toEqual([
      {
        label: 'sync-status.pull',
        started: true,
        finished: false,
        done: 5,
        total: 10,
      },
      {
        label: 'sync-status.integrate',
        started: false,
        finished: false,
        done: undefined,
        total: undefined,
      },
    ]);
  });

  it('legacy initialisation runs the v6 pull leg on a remote, not a central — and never pushes', () => {
    const remote = toSyncOverview(v5v6({}), false)?.steps.map(s => s.label);
    expect(remote).toEqual([
      'sync-status.prepare',
      'sync-status.pull-central',
      'sync-status.pull-remote',
      'sync-status.pull-v6',
      'sync-status.integrate',
    ]);
    expect(remote).not.toContain('sync-status.push');

    const central = toSyncOverview(v5v6({}), true)?.steps.map(s => s.label);
    expect(central).toEqual([
      'sync-status.prepare',
      'sync-status.pull-central',
      'sync-status.pull-remote',
      'sync-status.integrate',
    ]);
  });

  it('reports success only when not syncing, no error, and a finished sync exists', () => {
    const succeeded = toSyncOverview(
      v7({
        lastSuccessfulSync: {
          started: '2026-01-01T00:00:00Z',
          finished: '2026-01-01T00:01:00Z',
        },
      }),
      false
    );
    expect(succeeded?.succeeded).toBe(true);

    const stillSyncing = toSyncOverview(
      v7({
        isSyncing: true,
        lastSuccessfulSync: {
          started: '2026-01-01T00:00:00Z',
          finished: '2026-01-01T00:01:00Z',
        },
      }),
      false
    );
    expect(stillSyncing?.succeeded).toBe(false);
  });

  it('surfaces the sync error message', () => {
    const overview = toSyncOverview(
      v7({
        error: {
          variantV7: 'CONNECTION_ERROR',
          fullError: 'Connection refused',
        },
      }),
      false
    );
    expect(overview?.errorMessage).toBe('Connection refused');
    expect(overview?.succeeded).toBe(false);
  });
});
