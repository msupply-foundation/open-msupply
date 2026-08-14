import { createEffect, createSignal, onCleanup } from 'solid-js';
import {
  syncStatus,
  pushQueueCount,
  liveConnected,
  pollSyncStatus,
  triggerSync,
} from '../../api/syncStore';
import { isCentralServer } from '../../api/serverInfo';
import { storeContext } from '../../store/storeContext';
import { SYNC_INDICATOR_REFRESH_MS } from '../../config';
import { localisedDistanceToNow, t, tPlural } from '../../intl';
import {
  advanceTriggerState,
  armTrigger,
  IDLE_TRIGGER,
  toSyncOverview,
  syncFooterStatus,
} from './syncStatus';
import type { SyncFooterTone, TriggerState } from './syncStatus';

// Host-contract factory (spec/sync-modal/contract.md § Substrate): the bottom
// bar's sync cell — its status line, tone, in-flight flag, and the one-click
// sync itself — derived from the shared substrate store. Called in component
// scope by the shell (src/nav/ShellLayout.tsx).
//
// Owns the indicator's SLOW cadence (spec/chrome § sync status): an immediate
// first read at session start (the cell must not wait out the first interval),
// then a minutely re-evaluation that both re-ages the "Synced …" line and
// doubles as the slow fallback poll while the live channel is down. The modal
// owns the fast/live cadence; the subscription + reconnection live in the
// substrate store.
export const createSyncIndicator = (): {
  status: () => { label: string; tone: SyncFooterTone };
  syncing: () => boolean;
  syncNow: () => void;
} => {
  // A reactive `now`, ticked minutely, so both the staleness tone and the
  // "Synced 3 minutes ago" line re-evaluate while the app stays open.
  const [now, setNow] = createSignal(new Date());

  void pollSyncStatus();
  const timer = setInterval(() => {
    setNow(new Date());
    if (!liveConnected()) void pollSyncStatus();
  }, SYNC_INDICATOR_REFRESH_MS);
  onCleanup(() => clearInterval(timer));

  const overview = () =>
    toSyncOverview(syncStatus(), {
      operational: true,
      centralServer: isCentralServer(),
    });

  /*
   * SYNC-03.25's busy machine, the same one the modal's Sync-now button runs,
   * and the reason the trigger lives HERE rather than in the shell.
   *
   * `isSyncing` alone is not enough to drive the cell: a run that fails fast —
   * an unreachable central server being the everyday case — can start and end
   * between two status frames, so the in-flight state is never observed and the
   * cell would answer a click with nothing at all. Arming at the click and
   * holding until the run SIGNATURE changes covers that gap, and releases even
   * when the run errors before any in-progress frame arrives.
   */
  const [trigger, setTrigger] = createSignal<TriggerState>(IDLE_TRIGGER);
  createEffect(() => {
    const status = syncStatus();
    setTrigger(prev => advanceTriggerState(prev, status));
  });

  const syncNow = () => {
    setTrigger(armTrigger(syncStatus()));
    // Fire-and-forget; a request that itself fails releases the busy state (the
    // failure surfaces through the global unexpected-error handling).
    void triggerSync().then(ok => {
      if (!ok) setTrigger(IDLE_TRIGGER);
    });
  };

  const model = () => {
    // Armed but not yet reported as running — still "in flight" as far as the
    // user is concerned, and the only feedback their click gets.
    if (trigger().active) return { kind: 'syncing', tone: 'neutral' } as const;
    // Count gate: the store's sync-records display threshold (default 0 → any
    // non-zero count shows) — a consumed read owned by preferences.
    const displayThreshold =
      storeContext()?.preferences?.syncRecordsDisplayThreshold ?? 0;
    return syncFooterStatus(
      overview(),
      pushQueueCount(),
      displayThreshold,
      now()
    );
  };

  // The one line the cell shows. Resolved here rather than in the shell so the
  // chrome stays presentational — and so it re-translates on a language switch,
  // since t() and localisedDistanceToNow are both read at render.
  const label = (): string => {
    const state = model();
    switch (state.kind) {
      case 'waiting':
        return t('sync.waiting');
      case 'syncing':
        return t('sync-status.footer-syncing');
      case 'unreachable':
        return t('error.connection-error');
      case 'error':
        return t('sync-status.footer-error');
      case 'warning':
        return t('sync-status.footer-warning');
      case 'records-queued':
        return tPlural('sync-status.footer-records-queued', state.count);
      case 'synced':
        return t('sync-status.footer-synced', {
          distance: localisedDistanceToNow(state.finished),
        });
      case 'never-synced':
        return t('sync-status.footer-never-synced');
    }
  };

  return {
    status: () => ({ label: label(), tone: model().tone }),
    syncing: () => model().kind === 'syncing',
    syncNow,
  };
};
