import { createEffect, createSignal, onCleanup, Show, untrack } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { Alert } from '../../ui/elements/feedback/Alert';
import { ProgressList } from '../../ui/sync/ProgressList';
import { Button } from '../../ui/elements/buttons/Button';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  RadioIcon,
  SettingsIcon,
} from '../../ui/icons';
import { syncStepIcon } from './syncStepIcons';
import { t, tPlural, localisedDate, localisedTime } from '../../intl';
import { storeContext } from '../../store/storeContext';
import { isCentralServer } from '../../api/serverInfo';
import { SYNC_POLL_INTERVAL_MS } from '../../config';
import {
  liveConnected,
  pollSyncStatus,
  pushQueueCount,
  syncStatus,
  triggerSync,
} from '../../api/syncStore';
import {
  statusLineKind,
  syncDurationParts,
  toSyncOverview,
} from './syncStatus';
import { syncErrorSummary } from './syncErrors';
import styles from './SyncModal.module.css';

/*
 * The sync modal — spec/sync-modal (S1). Reads the shared substrate sync store
 * (live subscription fanned out; polling only while the live channel is down
 * and this surface is open). Status objects are rebuilt on every tick, so the
 * body avoids identity-keyed control flow (kdd/solid-reactivity-pitfalls).
 */
export const SyncModal: Component<{
  open: boolean;
  onClose: () => void;
}> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  // The operational overview: this surface's row of the phase-visibility
  // matrix (spec/sync-modal § phase visibility) over the store's raw status.
  const overview = () =>
    toSyncOverview(syncStatus(), {
      operational: true,
      centralServer: isCentralServer(),
    });

  // Busy from click until a status tick REFLECTS the run (AC-T1): the run is
  // visibly syncing, or it already ended (last-success moved, or an error
  // replaced the pre-trigger one). A pre-run tick on the polling fallback must
  // not release the latch early.
  const [triggering, setTriggering] = createSignal(false);
  let preTrigger: { lastFinished?: string; error?: string } = {};
  createEffect(() => {
    const o = overview();
    if (!o || !triggering()) return;
    const runReflected =
      o.isSyncing ||
      o.lastSuccessful?.finished !== preTrigger.lastFinished ||
      o.error?.fullError !== preTrigger.error;
    if (runReflected) setTriggering(false);
  });

  // Spec (sync-modal › status display): stays current while open — live
  // primary; poll while the live channel is down. One immediate poll covers
  // the no-data-yet first open (the subscription only pushes on change).
  createEffect(() => {
    if (!props.open) return;
    // untrack: the first-open check must not make every status tick re-run
    // this effect (it would rebuild the fallback interval on each poll).
    if (!untrack(syncStatus)) void pollSyncStatus();
    if (liveConnected()) return;
    const poller = window.setInterval(
      () => void pollSyncStatus(),
      SYNC_POLL_INTERVAL_MS
    );
    onCleanup(() => clearInterval(poller));
  });

  const isSyncing = () => overview()?.isSyncing === true;

  // Spec (sync-modal AC-S1): one status line by precedence.
  const statusLine = (): string => {
    switch (statusLineKind(overview(), pushQueueCount())) {
      case 'waiting':
        return t('sync.waiting');
      case 'syncing':
        return t('sync.modal.syncing');
      case 'records-to-push':
        return tPlural('sync.modal.records-to-push', pushQueueCount() ?? 0);
      case 'nothing-to-push':
        return t('sync.modal.nothing-to-push');
    }
  };

  // Spec (sync-modal AC-S3): only when idle and error-free; time-of-day if
  // today, else the date; plus the run's duration.
  const lastSuccess = () => {
    const o = overview();
    if (!o || o.isSyncing || o.error || !o.lastSuccessful) return undefined;
    return o.lastSuccessful;
  };
  const lastSuccessText = (last: {
    started: string;
    finished: string;
  }): string => {
    const finished = new Date(last.finished);
    const time =
      finished.toDateString() === new Date().toDateString()
        ? localisedTime(finished)
        : localisedDate(finished);
    // AC-S3: non-zero hours and minutes, then exact seconds — never an
    // approximation (the current app's "completed in 1 second").
    const { hours, minutes, seconds } = syncDurationParts(
      last.started,
      last.finished
    );
    const duration = [
      ...(hours > 0 ? [tPlural('duration.hours', hours)] : []),
      ...(minutes > 0 ? [tPlural('duration.minutes', minutes)] : []),
      tPlural('duration.seconds', seconds),
    ].join(' ');
    return t('sync.modal.last-success', { time, duration });
  };

  const isServerAdmin = () =>
    storeContext()?.me?.permissions.nodes.some(node =>
      node.permissions.includes('SERVER_ADMIN')
    ) === true;

  const syncNow = () => {
    preTrigger = {
      lastFinished: overview()?.lastSuccessful?.finished,
      error: overview()?.error?.fullError,
    };
    setTriggering(true);
    // Release the busy latch if the trigger itself failed (the failure has
    // already surfaced globally); a successful trigger stays busy until the
    // status stream reflects the run.
    void triggerSync().then(ok => {
      if (!ok) setTriggering(false);
    });
  };

  const openSettings = () => {
    props.onClose();
    navigate(`/${params.storeId}/settings`);
  };

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      closeButton
      title={t('sync.modal.title')}
      titleHidden
      widthRem={56}
      minBodyHeightRem={21}
    >
      <div class={styles.statusBand}>
        <p class={styles.statusLine} aria-live="polite">
          {statusLine()}
        </p>
        <Show when={overview()}>
          {o => (
            <ProgressList
              steps={o().steps.map(s => ({
                ...s,
                label: t(s.label),
                icon: syncStepIcon[s.kind],
              }))}
              error={o().error != null}
            />
          )}
        </Show>
      </div>

      <Show when={overview()?.error}>
        {error => (
          <Alert
            severity="error"
            icon={AlertTriangleIcon}
            class={styles.errorPanel}
          >
            <div class={styles.errorBody}>
              {t(syncErrorSummary(error().variant).summary)}
              <details class={styles.errorDetails}>
                <summary class={styles.errorSummary}>
                  {t('sync.modal.error-more-info')}
                  <ChevronDownIcon aria-hidden="true" />
                </summary>
                <Show when={syncErrorSummary(error().variant).hint}>
                  {hint => <p class={styles.errorHint}>{t(hint())}</p>}
                </Show>
                <pre class={styles.errorDetail}>{error().fullError}</pre>
              </details>
            </div>
          </Alert>
        )}
      </Show>

      <Show when={lastSuccess()}>
        {last => (
          <Alert
            severity="neutral"
            icon={CheckCircleIcon}
            class={styles.lastSuccess}
          >
            {lastSuccessText(last())}
          </Alert>
        )}
      </Show>

      <div class={styles.actions}>
        <Button
          icon={<RadioIcon />}
          loading={!overview() || triggering() || isSyncing()}
          onClick={syncNow}
        >
          {t('sync.modal.sync-now')}
        </Button>
        <Show when={isServerAdmin()}>
          <Button
            variant="secondary"
            icon={<SettingsIcon />}
            onClick={openSettings}
          >
            {t('sync.modal.settings')}
          </Button>
        </Show>
      </div>
    </Dialog>
  );
};
