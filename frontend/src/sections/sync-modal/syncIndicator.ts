import { createSignal, onCleanup } from 'solid-js';
import {
  syncStatus,
  pushQueueCount,
  liveConnected,
  pollSyncStatus,
} from '../../api/syncStore';
import { isCentralServer } from '../../api/serverInfo';
import { storeContext } from '../../store/storeContext';
import { SYNC_INDICATOR_REFRESH_MS } from '../../config';
import { localisedDistanceToNow, t, tPlural } from '../../intl';
import {
  toSyncOverview,
  syncFooterStatus,
  syncFooterSignal,
} from './syncStatus';
import type { SyncFooterSignal, SyncFooterTone } from './syncStatus';
import { syncNow, triggerActive } from './syncTrigger';

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
  status: () => {
    label: string;
    detail: string | undefined;
    tone: SyncFooterTone;
    signal: SyncFooterSignal;
  };
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
   * SYNC-03.25's busy machine — the SHARED one (syncTrigger.ts), so a run
   * started from the modal's Sync-now reads as in-flight here too.
   *
   * `isSyncing` alone is not enough to drive the cell: a run that fails fast —
   * an unreachable central server being the everyday case — can start and end
   * between two status frames, so the in-flight state is never observed and the
   * cell would answer a click with nothing at all. Arming at the click and
   * holding until the run SIGNATURE changes covers that gap, and releases even
   * when the run errors before any in-progress frame arrives.
   */
  const model = () => {
    // Armed but not yet reported as running — still "in flight" as far as the
    // user is concerned, and the only feedback their click gets.
    if (triggerActive()) return { kind: 'syncing', tone: 'neutral' } as const;
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
        return t('sync-status.footer-offline');
      case 'error':
        return t('sync-status.footer-error');
      case 'warning':
        return t('sync-status.footer-warning');
      case 'records-queued':
        return tPlural('sync-status.footer-records-queued', state.count);
      case 'synced':
        return t('sync-status.footer-synced');
      case 'never-synced':
        return t('sync-status.footer-never-synced');
    }
  };

  // How long ago the site last succeeded, for the states that name a fault
  // (issue #1087). A fault line that also says when the site was last whole is
  // the difference between an alarm and a report: the outage is the news, the
  // age is what tells the user whether it matters yet. Read from the overview
  // rather than the status union, which carries the stamp only on the quiet
  // line — the one state where it is the WHOLE message.
  const lastSynced = (): string | undefined => {
    const finished = overview()?.lastSuccessful?.finished;
    return finished
      ? t('sync-status.footer-last-synced', {
          distance: localisedDistanceToNow(finished),
        })
      : undefined;
  };

  // The muted tail beside the label — the relative time on the quiet line, and
  // the last-success age on the fault lines. States that are wholly told by
  // their label (a queue count, a run in flight) carry none.
  const detail = (): string | undefined => {
    const state = model();
    switch (state.kind) {
      case 'synced':
        return localisedDistanceToNow(state.finished);
      case 'unreachable':
        return lastSynced() ?? t('sync-status.footer-never-synced');
      case 'error':
      case 'warning':
        return lastSynced();
      case 'waiting':
      case 'syncing':
      case 'records-queued':
      case 'never-synced':
        return undefined;
    }
  };

  return {
    status: () => ({
      label: label(),
      detail: detail(),
      tone: model().tone,
      signal: syncFooterSignal(model().kind),
    }),
    syncing: () => model().kind === 'syncing',
    syncNow,
  };
};
