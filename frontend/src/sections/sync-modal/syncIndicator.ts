import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { differenceInDays } from 'date-fns';
import { t, tPlural } from '../../intl';
import type { NavBadge } from '../../ui/layout/AppShell/navModel';
import { storeContext } from '../../store/storeContext';
import { isCentralServer } from '../../api/serverInfo';
import {
  liveConnected,
  pollSyncStatus,
  pushQueueCount,
  syncStatus,
} from '../../api/syncStore';
import { SYNC_INDICATOR_REFRESH_MS } from '../../config';
import { toSyncOverview, type SyncOverview } from './syncStatus';

// Spec (chrome › sync indicator): the sidebar Sync entry's badge, derived from
// the shared sync status. Captured from the current app.
export type SyncIndicatorBadge =
  // A latest-run error that is NOT a connection error flags immediately.
  | { kind: 'alert' }
  // Otherwise the records-to-push count, once it reaches the store's display
  // threshold, coloured by days since the last successful sync.
  | { kind: 'count'; count: number; tone: 'neutral' | 'warning' | 'error' }
  | undefined;

// Connection errors are deliberately tolerated — transient outages between
// scheduled runs are normal; they surface only through staleness colouring.
const CONNECTION_VARIANT = 'CONNECTION_ERROR';

export const syncIndicatorBadge = (
  overview: SyncOverview | undefined,
  pushQueueCount: number | undefined,
  displayThreshold: number,
  now: Date
): SyncIndicatorBadge => {
  if (!overview) return undefined;

  if (overview.error && overview.error.variant !== CONNECTION_VARIANT) {
    return { kind: 'alert' };
  }

  const count = pushQueueCount ?? 0;
  if (count <= 0 || count < displayThreshold) return undefined;

  // No successful sync on record counts as zero days stale (matches the
  // current app: a brand-new site shouldn't open on an error-red badge).
  const daysStale = overview.lastSuccessful
    ? differenceInDays(now, new Date(overview.lastSuccessful.finished))
    : 0;

  const tone =
    daysStale >= overview.errorThresholdDays
      ? 'error'
      : daysStale >= overview.warningThresholdDays
        ? 'warning'
        : 'neutral';
  return { kind: 'count', count, tone };
};

// HOST CONTRACT (spec/sync-modal contract § Substrate; spec/chrome § sync
// indicator): the shell's ShellLayout imports this factory to feed the chrome
// Sync entry's badge slot. Called in component scope (it registers effects and
// cleanup); returns the badge value and the errored-run dim flag.
export const createSyncIndicator = (): {
  badge: () => NavBadge | undefined;
  dimmed: () => boolean;
} => {
  // Spec (chrome › sync indicator): the badge colour depends on days since the
  // last successful sync, so it must move with time, not only with data — a
  // minutely tick re-evaluates it. The same cadence covers the indicator's
  // fallback refresh while the live channel is down (the modal owns the fast
  // poll while it is open).
  const [now, setNow] = createSignal(new Date());
  onMount(() => {
    const tick = window.setInterval(
      () => setNow(new Date()),
      SYNC_INDICATOR_REFRESH_MS
    );
    onCleanup(() => clearInterval(tick));
  });
  createEffect(() => {
    if (liveConnected()) return;
    // Immediate fill (the badge shouldn't wait a minute after login), then the
    // slow cadence; a response superseded by live data is dropped by the store.
    void pollSyncStatus();
    const poller = window.setInterval(
      () => void pollSyncStatus(),
      SYNC_INDICATOR_REFRESH_MS
    );
    onCleanup(() => clearInterval(poller));
  });

  const overview = () =>
    toSyncOverview(syncStatus(), {
      operational: true,
      centralServer: isCentralServer(),
    });

  const badge = (): NavBadge | undefined => {
    const raw = syncIndicatorBadge(
      overview(),
      pushQueueCount(),
      storeContext()?.preferences.syncRecordsDisplayThreshold ?? 0,
      now()
    );
    if (!raw) return undefined;
    return raw.kind === 'alert'
      ? { kind: 'alert', title: t('sync.indicator.alert') }
      : {
          kind: 'count',
          // Capped as in the current app (spec/chrome § sync indicator, D9);
          // the title still carries the exact count.
          label: raw.count > 99 ? '99+' : String(raw.count),
          tone: raw.tone,
          title: tPlural('sync.modal.records-to-push', raw.count),
        };
  };

  const dimmed = () => overview()?.error != null;

  return { badge, dimmed };
};
