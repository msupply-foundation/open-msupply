import { describe, expect, it } from 'vitest';
import type { SyncStatusFragment } from '../api/initialisation.generated';
import { toSyncOverview } from './syncStatus';

const v7 = (
  overrides: Partial<Extract<SyncStatusFragment, { __typename: 'FullSyncStatusV7Node' }>>
): SyncStatusFragment => ({
  __typename: 'FullSyncStatusV7Node',
  isSyncing: false,
  error: null,
  pull: null,
  push: null,
  integration: null,
  lastSuccessfulSync: null,
  ...overrides,
});

describe('toSyncOverview', () => {
  it('is undefined without a status', () => {
    expect(toSyncOverview(null)).toBeUndefined();
  });

  it('maps in-progress steps with counts', () => {
    const overview = toSyncOverview(
      v7({
        isSyncing: true,
        pull: { started: '2026-01-01T00:00:00Z', finished: null, done: 5, total: 10 },
      })
    );
    expect(overview?.isSyncing).toBe(true);
    expect(overview?.succeeded).toBe(false);
    expect(overview?.steps).toEqual([
      { label: 'Pull', started: true, finished: false, done: 5, total: 10 },
      { label: 'Push', started: false, finished: false, done: undefined, total: undefined },
      { label: 'Integration', started: false, finished: false, done: undefined, total: undefined },
    ]);
  });

  it('reports success only when not syncing, no error, and a finished sync exists', () => {
    const succeeded = toSyncOverview(
      v7({ lastSuccessfulSync: { started: '2026-01-01T00:00:00Z', finished: '2026-01-01T00:01:00Z' } })
    );
    expect(succeeded?.succeeded).toBe(true);

    const stillSyncing = toSyncOverview(
      v7({
        isSyncing: true,
        lastSuccessfulSync: { started: '2026-01-01T00:00:00Z', finished: '2026-01-01T00:01:00Z' },
      })
    );
    expect(stillSyncing?.succeeded).toBe(false);
  });

  it('surfaces the sync error message', () => {
    const overview = toSyncOverview(v7({ error: { fullError: 'Connection refused' } }));
    expect(overview?.errorMessage).toBe('Connection refused');
    expect(overview?.succeeded).toBe(false);
  });
});
