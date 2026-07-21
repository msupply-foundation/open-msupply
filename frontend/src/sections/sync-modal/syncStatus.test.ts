import { describe, expect, it } from 'vitest';
import type { SyncStatusFragment } from '../../api/initialisation.generated';
import {
  advanceTriggerState,
  armTrigger,
  durationUnits,
  IDLE_TRIGGER,
  statusLineKind,
  syncDurationParts,
  syncIndicatorBadge,
  toSyncOverview,
  type SyncSurfaceContext,
} from './syncStatus';

type V7 = Extract<SyncStatusFragment, { __typename: 'FullSyncStatusV7Node' }>;
type V5V6 = Extract<
  SyncStatusFragment,
  { __typename: 'FullSyncStatusV5V6Node' }
>;

const v7 = (overrides: Partial<V7> = {}): SyncStatusFragment => ({
  __typename: 'FullSyncStatusV7Node',
  isSyncing: false,
  summary: { started: '2026-01-01T00:00:00Z' },
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

// A phase node with progress fields; started but not finished by default.
const phase = (
  part: Partial<{
    finished: string | null;
    total: number | null;
    done: number | null;
  }> = {}
) => ({
  started: '2026-01-01T00:00:00Z',
  finished: null,
  total: null,
  done: null,
  ...part,
});

const MODAL: SyncSurfaceContext = { operational: true, centralServer: false };
const MODAL_CENTRAL: SyncSurfaceContext = {
  operational: true,
  centralServer: true,
};
const INIT: SyncSurfaceContext = { operational: false, centralServer: false };
const INIT_CENTRAL: SyncSurfaceContext = {
  operational: false,
  centralServer: true,
};

const labels = (status: SyncStatusFragment, ctx: SyncSurfaceContext) =>
  toSyncOverview(status, ctx)?.steps.map(s => s.label);

describe('toSyncOverview — phase set matches the context (AC-S5)', () => {
  it('is undefined without a status', () => {
    expect(toSyncOverview(null, MODAL)).toBeUndefined();
    expect(toSyncOverview(undefined, MODAL)).toBeUndefined();
  });

  it('current (v7) modal: push · wait · pull · integrate', () => {
    expect(labels(v7(), MODAL)).toEqual([
      'sync-status.push',
      'sync-status.waiting-for-integration',
      'sync-status.pull',
      'sync-status.integrate',
    ]);
  });

  it('current (v7) initialisation: pull · integrate', () => {
    expect(labels(v7(), INIT)).toEqual([
      'sync-status.pull',
      'sync-status.integrate',
    ]);
  });

  it('legacy modal central: push · pull central · pull remote · integrate', () => {
    expect(labels(v5v6(), MODAL_CENTRAL)).toEqual([
      'sync-status.push',
      'sync-status.pull-central',
      'sync-status.pull-remote',
      'sync-status.integrate',
    ]);
  });

  it('legacy modal remote: push(v6) · push · pull central · pull remote · pull(v6) · integrate', () => {
    expect(labels(v5v6(), MODAL)).toEqual([
      'sync-status.push-v6',
      'sync-status.push',
      'sync-status.pull-central',
      'sync-status.pull-remote',
      'sync-status.pull-v6',
      'sync-status.integrate',
    ]);
  });

  it('legacy initialisation central: prepare · pull central · pull remote · integrate', () => {
    expect(labels(v5v6(), INIT_CENTRAL)).toEqual([
      'sync-status.prepare',
      'sync-status.pull-central',
      'sync-status.pull-remote',
      'sync-status.integrate',
    ]);
  });

  it('legacy initialisation remote: prepare · pull central · pull remote · pull(v6) · integrate', () => {
    expect(labels(v5v6(), INIT)).toEqual([
      'sync-status.prepare',
      'sync-status.pull-central',
      'sync-status.pull-remote',
      'sync-status.pull-v6',
      'sync-status.integrate',
    ]);
  });

  it('the modal never shows prepare; init never shows push; central never shows a v6 leg', () => {
    const modal = [
      ...(labels(v7(), MODAL) ?? []),
      ...(labels(v5v6(), MODAL) ?? []),
      ...(labels(v5v6(), MODAL_CENTRAL) ?? []),
    ];
    expect(modal).not.toContain('sync-status.prepare');

    const init = [
      ...(labels(v7(), INIT) ?? []),
      ...(labels(v5v6(), INIT) ?? []),
      ...(labels(v5v6(), INIT_CENTRAL) ?? []),
    ];
    expect(init).not.toContain('sync-status.push');
    expect(init).not.toContain('sync-status.push-v6');

    const central = [
      ...(labels(v5v6(), MODAL_CENTRAL) ?? []),
      ...(labels(v5v6(), INIT_CENTRAL) ?? []),
    ];
    expect(central).not.toContain('sync-status.pull-v6');
    expect(central).not.toContain('sync-status.push-v6');
  });
});

describe('toSyncOverview — phase list with progress (AC-S2)', () => {
  it('marks an in-progress phase with done/total where countable', () => {
    const push = toSyncOverview(
      v7({ isSyncing: true, push: phase({ done: 5, total: 10 }) }),
      MODAL
    )?.steps.find(s => s.label === 'sync-status.push');
    expect(push).toMatchObject({
      started: true,
      finished: false,
      done: 5,
      total: 10,
    });
  });

  it('shows no count when the total is zero or unreported', () => {
    const steps = toSyncOverview(
      v7({
        push: phase({ total: 0, done: 0 }),
        waitingForIntegration: {
          started: '2026-01-01T00:00:00Z',
          finished: null,
        },
      }),
      MODAL
    )?.steps;
    const push = steps?.find(s => s.label === 'sync-status.push');
    expect(push?.done).toBeUndefined();
    expect(push?.total).toBeUndefined();
    const wait = steps?.find(
      s => s.label === 'sync-status.waiting-for-integration'
    );
    expect(wait?.done).toBeUndefined();
    expect(wait?.total).toBeUndefined();
  });

  it('a known total with no done yet reads 0 / N', () => {
    const pull = toSyncOverview(
      v7({ pull: phase({ total: 10, done: null }) }),
      MODAL
    )?.steps.find(s => s.label === 'sync-status.pull');
    expect(pull).toMatchObject({ done: 0, total: 10 });
  });

  it('leaves an unreached phase pending; keeps an idle run’s phases visible', () => {
    const pending = toSyncOverview(v7({ push: null }), MODAL)?.steps.find(
      s => s.label === 'sync-status.push'
    );
    expect(pending).toMatchObject({ started: false, finished: false });

    const done = {
      started: '2026-01-01T00:00:00Z',
      finished: '2026-01-01T00:00:05Z',
      total: null,
      done: null,
    };
    const idle = toSyncOverview(
      v7({
        push: done,
        waitingForIntegration: {
          started: done.started,
          finished: done.finished,
        },
        pull: done,
        integration: done,
      }),
      MODAL
    )?.steps;
    expect(idle?.every(s => s.finished)).toBe(true);
  });
});

describe('statusLineKind — status-line precedence (AC-S1)', () => {
  const idle = toSyncOverview(v7(), MODAL);
  const syncing = toSyncOverview(v7({ isSyncing: true }), MODAL);

  it('waiting before any status has arrived', () => {
    expect(statusLineKind(undefined, 5)).toBe('waiting');
  });
  it('syncing takes precedence over a non-zero count', () => {
    expect(statusLineKind(syncing, 12)).toBe('syncing');
  });
  it('records-to-push when idle with a positive count', () => {
    expect(statusLineKind(idle, 12)).toBe('records-to-push');
  });
  it('nothing-to-push when idle with a zero/undefined count', () => {
    expect(statusLineKind(idle, 0)).toBe('nothing-to-push');
    expect(statusLineKind(idle, undefined)).toBe('nothing-to-push');
  });
});

describe('records-to-push drains on success (AC-Q2)', () => {
  it('a successful run with a zero count reads nothing-to-push', () => {
    const succeeded = toSyncOverview(
      v7({ lastSuccessfulSync: { started: 'a', finished: 'b' } }),
      MODAL
    );
    expect(statusLineKind(succeeded, 0)).toBe('nothing-to-push');
  });
});

describe('display tracks the latest status (AC-S4)', () => {
  it('is a pure function of the latest status — successive statuses yield successive displays', () => {
    expect(
      statusLineKind(toSyncOverview(v7({ isSyncing: true }), MODAL), 0)
    ).toBe('syncing');
    expect(
      statusLineKind(
        toSyncOverview(
          v7({ lastSuccessfulSync: { started: 'a', finished: 'b' } }),
          MODAL
        ),
        0
      )
    ).toBe('nothing-to-push');
  });
});

describe('duration decomposition and units (AC-S3)', () => {
  const base = Date.parse('2026-01-01T00:00:00Z');
  const parts = (seconds: number) =>
    syncDurationParts(
      '2026-01-01T00:00:00Z',
      new Date(base + seconds * 1000).toISOString()
    );

  it('decomposes elapsed time into hours/minutes/seconds', () => {
    expect(parts(0)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
    expect(parts(1)).toEqual({ hours: 0, minutes: 0, seconds: 1 });
    expect(parts(65)).toEqual({ hours: 0, minutes: 1, seconds: 5 });
    expect(parts(3661)).toEqual({ hours: 1, minutes: 1, seconds: 1 });
  });

  it('always lists seconds; lists hours/minutes only when non-zero', () => {
    // "0 seconds", "1 second"
    expect(durationUnits(parts(0))).toEqual([
      { key: 'label.seconds', count: 0 },
    ]);
    expect(durationUnits(parts(1))).toEqual([
      { key: 'label.seconds', count: 1 },
    ]);
    // "1 minute 5 seconds"
    expect(durationUnits(parts(65))).toEqual([
      { key: 'label.minutes', count: 1 },
      { key: 'label.seconds', count: 5 },
    ]);
    // "1 hour 0 seconds" — a zero minute is dropped, seconds stay
    expect(durationUnits(parts(3600))).toEqual([
      { key: 'label.hours', count: 1 },
      { key: 'label.seconds', count: 0 },
    ]);
    expect(durationUnits(parts(3661))).toEqual([
      { key: 'label.hours', count: 1 },
      { key: 'label.minutes', count: 1 },
      { key: 'label.seconds', count: 1 },
    ]);
  });
});

describe('Sync-now busy state machine (AC-T1)', () => {
  const idleStatus = v7({
    lastSuccessfulSync: { started: 'a', finished: 'b' },
  });
  const armed = armTrigger(idleStatus);

  it('does nothing while the user has not triggered', () => {
    expect(advanceTriggerState(IDLE_TRIGGER, v7({ isSyncing: true }))).toBe(
      IDLE_TRIGGER
    );
  });

  it('holds through a stale pre-run tick — the same status must not release it', () => {
    expect(advanceTriggerState(armed, idleStatus)).toBe(armed);
  });

  it('holds while the run is in progress', () => {
    const running = advanceTriggerState(
      armed,
      v7({ isSyncing: true, push: phase({ done: 1, total: 5 }) })
    );
    expect(running.active).toBe(true);
  });

  it('releases when a changed not-syncing status arrives (the run ended)', () => {
    const succeeded = advanceTriggerState(
      armed,
      v7({ lastSuccessfulSync: { started: 'a', finished: 'c' } })
    );
    expect(succeeded).toEqual(IDLE_TRIGGER);
  });

  it('releases even when the run errors before any in-progress frame is seen (the stuck-spinner bug)', () => {
    const erroredFast = advanceTriggerState(
      armed,
      v7({
        error: { variantV7: 'DATABASE_ERROR', fullError: 'boom' },
        lastSuccessfulSync: { started: 'a', finished: 'b' },
      })
    );
    expect(erroredFast).toEqual(IDLE_TRIGGER);
  });

  it('releases a handshake-stage retry that re-fails identically — runs differ only by summary.started (B1)', () => {
    // A connection/auth failure before any phase starts: all phase nodes null
    // and a byte-identical error — only summary.started distinguishes the runs.
    const errored = (started: string) =>
      v7({
        summary: { started },
        error: {
          variantV7: 'CONNECTION_ERROR',
          fullError: 'Unable to connect',
        },
      });
    const armed = armTrigger(errored('2026-01-01T00:00:00Z'));
    // The SAME run redelivered (a stale pre-run tick) must NOT release it.
    expect(advanceTriggerState(armed, errored('2026-01-01T00:00:00Z'))).toBe(
      armed
    );
    // The retry is a NEW run (new summary.started) that re-fails identically —
    // it must still release the button so the user can trigger again.
    expect(advanceTriggerState(armed, errored('2026-01-01T00:05:00Z'))).toEqual(
      IDLE_TRIGGER
    );
  });
});

describe('a failed run preserves the last-successful record (AC-E2)', () => {
  it('keeps lastSuccessful and reports not-succeeded while errored', () => {
    const ov = toSyncOverview(
      v7({
        error: { variantV7: 'CONNECTION_ERROR', fullError: 'refused' },
        lastSuccessfulSync: { started: 'a', finished: 'b' },
      }),
      MODAL
    );
    expect(ov?.error?.variant).toBe('CONNECTION_ERROR');
    expect(ov?.lastSuccessful).toEqual({ started: 'a', finished: 'b' });
    expect(ov?.succeeded).toBe(false);
  });

  it('succeeds only when idle, error-free, and a successful run exists', () => {
    const withSuccess = { lastSuccessfulSync: { started: 'a', finished: 'b' } };
    expect(toSyncOverview(v7(withSuccess), MODAL)?.succeeded).toBe(true);
    expect(
      toSyncOverview(v7({ ...withSuccess, isSyncing: true }), MODAL)?.succeeded
    ).toBe(false);
    expect(toSyncOverview(v7(), MODAL)?.succeeded).toBe(false);
  });
});

describe('a later successful run clears the error (AC-E3)', () => {
  it('error is a pure derivation of the latest status — a subsequent error-free run clears it', () => {
    const errored = toSyncOverview(
      v7({ error: { variantV7: 'CONNECTION_ERROR', fullError: 'refused' } }),
      MODAL
    );
    expect(errored?.error?.variant).toBe('CONNECTION_ERROR');
    // The next (successful) run's status carries no error, so the modal's
    // error-panel derivation yields nothing and the notice returns.
    const cleared = toSyncOverview(
      v7({ lastSuccessfulSync: { started: 'a', finished: 'b' } }),
      MODAL
    );
    expect(cleared?.error).toBeUndefined();
    expect(cleared?.succeeded).toBe(true);
  });
});

describe('syncIndicatorBadge — chrome indicator badge (spec/chrome § sync indicator)', () => {
  const now = new Date('2026-01-10T00:00:00Z');
  const errored = (
    variant: 'CONNECTION_ERROR' | 'INVALID_SITE_NAME_OR_PASSWORD'
  ) =>
    toSyncOverview(
      v7({ error: { variantV7: variant, fullError: 'x' } }),
      MODAL
    );
  const staleBy = (days: number) =>
    toSyncOverview(
      v7({
        lastSuccessfulSync: {
          started: 'a',
          finished: new Date(now.getTime() - days * 86_400_000).toISOString(),
        },
      }),
      MODAL
    );

  it('is absent without a status', () => {
    expect(syncIndicatorBadge(undefined, 5, 0, now)).toBeUndefined();
  });

  it('flags a non-connection error immediately', () => {
    expect(
      syncIndicatorBadge(errored('INVALID_SITE_NAME_OR_PASSWORD'), 0, 0, now)
    ).toEqual({ kind: 'alert' });
  });

  it('tolerates a connection error (no alert marker)', () => {
    expect(
      syncIndicatorBadge(errored('CONNECTION_ERROR'), 0, 0, now)
    ).toBeUndefined();
  });

  it('shows the count only once it reaches the display threshold', () => {
    expect(syncIndicatorBadge(staleBy(0), 3, 5, now)).toBeUndefined();
    expect(syncIndicatorBadge(staleBy(0), 5, 5, now)).toEqual({
      kind: 'count',
      count: 5,
      tone: 'neutral',
    });
    // Nothing to push → no badge, whatever the threshold.
    expect(syncIndicatorBadge(staleBy(0), 0, 0, now)).toBeUndefined();
  });

  it('escalates the tone by days since the last successful sync', () => {
    expect(syncIndicatorBadge(staleBy(0), 5, 0, now)).toEqual({
      kind: 'count',
      count: 5,
      tone: 'neutral',
    });
    expect(syncIndicatorBadge(staleBy(1), 5, 0, now)).toEqual({
      kind: 'count',
      count: 5,
      tone: 'warning',
    });
    expect(syncIndicatorBadge(staleBy(3), 5, 0, now)).toEqual({
      kind: 'count',
      count: 5,
      tone: 'error',
    });
  });

  it('treats a site with no successful sync as fresh (never red on a new site)', () => {
    expect(syncIndicatorBadge(toSyncOverview(v7(), MODAL), 5, 0, now)).toEqual({
      kind: 'count',
      count: 5,
      tone: 'neutral',
    });
  });
});
