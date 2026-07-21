import { createSignal, onCleanup } from 'solid-js';
import type { NavBadge } from '../../ui/layout/AppShell/navModel';
import {
  syncStatus,
  pushQueueCount,
  liveConnected,
  pollSyncStatus,
} from '../../api/syncStore';
import { isCentralServer } from '../../api/serverInfo';
import { storeContext } from '../../store/storeContext';
import { SYNC_INDICATOR_REFRESH_MS } from '../../config';
import { t } from '../../intl';
import { toSyncOverview, syncIndicatorBadge } from './syncStatus';

// Host-contract factory (spec/sync-modal/contract.md § Substrate): the chrome
// Sync entry's badge + errored-run icon dim, derived from the shared substrate
// store. Called in component scope by the shell (src/nav/ShellLayout.tsx).
//
// Owns the indicator's SLOW cadence (spec/chrome § sync indicator): an
// immediate first read at session start (the badge must not wait out the first
// interval), then a minutely staleness re-evaluation that doubles as the slow
// fallback poll while the live channel is down. The modal owns the fast/live
// cadence; the subscription + reconnection live in the substrate store.
export const createSyncIndicator = (): {
  badge: () => NavBadge | undefined;
  dimmed: () => boolean;
} => {
  // A reactive `now`, ticked minutely, so the staleness tone re-evaluates as
  // days pass while the app stays open.
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

  const badge = (): NavBadge | undefined => {
    // Count-badge gate: the store's sync-records display threshold (default 0 →
    // any non-zero count shows) — a consumed read owned by preferences.
    const displayThreshold =
      storeContext()?.preferences?.syncRecordsDisplayThreshold ?? 0;
    const model = syncIndicatorBadge(
      overview(),
      pushQueueCount(),
      displayThreshold,
      now()
    );
    if (!model) return undefined;
    if (model.kind === 'alert')
      return { kind: 'alert', title: t('sync.indicator.alert') };
    // Counts above 99 display as "99+"; the hover/accessible text keeps the
    // exact count (spec DIVERGENCES D9).
    return {
      kind: 'count',
      label: model.count > 99 ? '99+' : String(model.count),
      tone: model.tone,
      title: String(model.count),
    };
  };

  // The icon dims while the latest run is errored (spec/chrome § sync
  // indicator); no required meaning rides on the dim alone — the durable
  // signals are the alert marker and the staleness colouring.
  const dimmed = () => overview()?.error != null;

  return { badge, dimmed };
};
