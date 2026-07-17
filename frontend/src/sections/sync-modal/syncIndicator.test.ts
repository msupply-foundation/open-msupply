import { describe, expect, it } from 'vitest';
import { syncIndicatorBadge } from './syncIndicator';
import type { SyncOverview } from './syncStatus';

const overview = (overrides: Partial<SyncOverview> = {}): SyncOverview => ({
  isSyncing: false,
  error: undefined,
  steps: [],
  succeeded: true,
  warningThresholdDays: 1,
  errorThresholdDays: 3,
  lastSuccessful: { started: '2026-07-15T00:00:00Z', finished: '2026-07-15T00:00:05Z' },
  ...overrides,
});

const daysAfter = (iso: string, days: number) =>
  new Date(new Date(iso).getTime() + days * 24 * 60 * 60 * 1000);

const NOW = new Date('2026-07-15T01:00:00Z');

describe('syncIndicatorBadge', () => {
  it('is nothing before any status arrives', () => {
    expect(syncIndicatorBadge(undefined, 500, 0, NOW)).toBeUndefined();
  });

  // AC-CH9: non-connection errors flag immediately; connection errors don't.
  it('AC-CH9: a non-connection error shows the alert badge immediately', () => {
    const o = overview({ error: { variant: 'INCORRECT_PASSWORD', fullError: 'x' } });
    expect(syncIndicatorBadge(o, 0, 0, NOW)).toEqual({ kind: 'alert' });
  });

  it('AC-CH9: a connection error shows no alert badge (staleness still applies)', () => {
    const o = overview({ error: { variant: 'CONNECTION_ERROR', fullError: 'x' } });
    expect(syncIndicatorBadge(o, 0, 0, NOW)).toBeUndefined();
    // With a pending count, the count badge (and its staleness tone) still shows.
    expect(syncIndicatorBadge(o, 42, 0, NOW)).toMatchObject({ kind: 'count', count: 42 });
  });

  // AC-CH10: count badge gated by the display-threshold preference.
  it('AC-CH10: below the display threshold no count badge shows; at it, it shows', () => {
    const o = overview();
    expect(syncIndicatorBadge(o, 99, 100, NOW)).toBeUndefined();
    expect(syncIndicatorBadge(o, 100, 100, NOW)).toMatchObject({ kind: 'count', count: 100 });
  });

  it('AC-CH10: at the default threshold of zero, any non-zero count shows and zero hides', () => {
    const o = overview();
    expect(syncIndicatorBadge(o, 0, 0, NOW)).toBeUndefined();
    expect(syncIndicatorBadge(o, 1, 0, NOW)).toMatchObject({ kind: 'count', count: 1 });
  });

  // AC-CH11: badge colour escalates with days since last successful sync.
  it('AC-CH11: neutral below warning, warning at 1 day, error at 3 days', () => {
    const finished = '2026-07-10T00:00:00Z';
    const o = overview({ lastSuccessful: { started: finished, finished } });
    expect(syncIndicatorBadge(o, 5, 0, daysAfter(finished, 0))).toMatchObject({ tone: 'neutral' });
    expect(syncIndicatorBadge(o, 5, 0, daysAfter(finished, 1))).toMatchObject({ tone: 'warning' });
    expect(syncIndicatorBadge(o, 5, 0, daysAfter(finished, 2))).toMatchObject({ tone: 'warning' });
    expect(syncIndicatorBadge(o, 5, 0, daysAfter(finished, 3))).toMatchObject({ tone: 'error' });
  });

  it('AC-CH11: no successful sync on record counts as zero days stale', () => {
    const o = overview({ lastSuccessful: undefined, succeeded: false });
    expect(syncIndicatorBadge(o, 5, 0, NOW)).toMatchObject({ tone: 'neutral' });
  });
});
