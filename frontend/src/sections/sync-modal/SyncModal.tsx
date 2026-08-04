import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  onCleanup,
  Show,
  Switch,
  type Component,
} from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { Alert } from '../../ui/elements/feedback/Alert';
import { ErrorDetails } from '../../ui/elements/feedback/ErrorDetails';
import { Button } from '../../ui/elements/buttons/Button';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { ProgressList, type ProgressStep } from '../../ui/sync/ProgressList';
import { CheckCircleIcon, SyncIcon, SettingsIcon } from '../../ui/icons';
import { t, tPlural, localisedDate, localisedTime } from '../../intl';
import {
  syncStatus,
  pushQueueCount,
  liveConnected,
  pollSyncStatus,
  triggerSync,
} from '../../api/syncStore';
import { isCentralServer } from '../../api/serverInfo';
import { hasPermission } from '../../store/storeContext';
import { SYNC_POLL_INTERVAL_MS } from '../../config';
import {
  advanceTriggerState,
  armTrigger,
  durationUnits,
  IDLE_TRIGGER,
  statusLineKind,
  syncDurationParts,
  toSyncOverview,
  type SyncBackfill,
  type TriggerState,
} from './syncStatus';
import { syncErrorSummary } from './syncErrors';
import { syncStepIcon } from './syncStepIcons';
import styles from './SyncModal.module.css';

// Time-of-day if the run finished today, otherwise the date (SYNC-03.21).
const isSameLocalDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/*
 * The sync modal (spec/sync-modal S1) — the app's window onto sync health: the
 * status line, the phase list, a failed run's error, the last-successful
 * notice, and the Sync-now trigger. Host-contract export the shell lazy-mounts
 * (contract.md § Substrate); its own lazy chunk.
 *
 * Reads the shared substrate store for status/count/liveness and adds only its
 * two residual obligations (SYNC-03.22): one immediate poll on open when NO
 * status is cached (the subscription sends no initial frame), and the fast
 * fallback poll while open AND the live channel is down. The live channel, its
 * transport-ack liveness, reconnection, poll supersession, the fire-and-forget
 * trigger, and the post-run app refresh all live in the substrate.
 */
export const SyncModal: Component<{
  open: boolean;
  onClose: () => void;
}> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  const overview = createMemo(() =>
    toSyncOverview(syncStatus(), {
      operational: true,
      centralServer: isCentralServer(),
    })
  );
  const statusKind = () => statusLineKind(overview(), pushQueueCount());

  // SYNC-03.22: fetch once on open when nothing is cached (no initial
  // subscription frame — contract.md § Records to push). Fires exactly once per
  // open while uncached; a landed status flips the guard.
  createEffect(() => {
    if (props.open && syncStatus() == null) void pollSyncStatus();
  });

  // SYNC-03.22: the fast fallback interval, only while open and the live
  // channel is down (the substrate store drops a stale poll once live data
  // resumes).
  createEffect(() => {
    if (!props.open || liveConnected()) return;
    const id = setInterval(() => void pollSyncStatus(), SYNC_POLL_INTERVAL_MS);
    onCleanup(() => clearInterval(id));
  });

  // SYNC-03.25: Sync-now busy state — held from the click, through the pre-run
  // gap, until the run ends. Keyed on the run-status signature (not the
  // isSyncing transition), so a run that errors before any in-progress frame is
  // observed still releases the button for a retry.
  const [trigger, setTrigger] = createSignal<TriggerState>(IDLE_TRIGGER);
  createEffect(() => {
    const status = syncStatus();
    setTrigger(prev => advanceTriggerState(prev, status));
  });
  const busy = createMemo(
    () =>
      trigger().active ||
      (overview()?.isSyncing ?? false) ||
      overview() === undefined
  );

  const onSyncNow = async () => {
    setTrigger(armTrigger(syncStatus()));
    // Fire-and-forget; a request that itself fails releases the busy state (the
    // failure surfaces through the global unexpected-error handling).
    const ok = await triggerSync();
    if (!ok) setTrigger(IDLE_TRIGGER);
  };

  // Server-admin only: closes the modal and navigates to sync settings. The
  // sync-settings screen is owned elsewhere (spec/sync-modal/README § scope),
  // not yet built; the app's Settings destination is its current home.
  const onSettings = () => {
    props.onClose();
    navigate(`/${params.storeId}/settings`);
  };

  const lastSuccessTime = (finished: string): string =>
    isSameLocalDay(new Date(finished), new Date())
      ? localisedTime(finished)
      : localisedDate(finished);

  const lastSuccessDuration = (started: string, finished: string): string =>
    durationUnits(syncDurationParts(started, finished))
      .map(unit => tPlural(unit.key, unit.count))
      .join(' ');

  const progressSteps = (): ProgressStep[] =>
    overview()?.steps.map(s => ({
      label: t(s.label),
      started: s.started,
      finished: s.finished,
      done: s.done,
      total: s.total,
      icon: syncStepIcon[s.kind],
    })) ?? [];

  // The run's backfill descriptions (V7 only; empty for an ordinary run). Shown
  // under a "Special syncs" disclosure below the phase list, the same
  // expandable pattern as the error panel's "More information".
  const backfills = (): SyncBackfill[] => overview()?.backfills ?? [];
  const backfillLabel = (b: SyncBackfill): string =>
    b.kind === 'all-store-data'
      ? t('sync-status.description.all-store-data', { storeName: b.storeName })
      : t('sync-status.description.table-name', { tableName: b.tableName });

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={t('sync')}
      titleHidden
      closeButton
      widthRem={36}
      testId="sync-modal"
      // No confirm semantics: Sync Now is a trigger, not a Save — Enter from
      // the (buttonless) body must not start a sync run.
      enterConfirms={false}
      // Action row, centred — in the Dialog's actions slot so it sticks to the
      // modal's bottom edge like every other modal's buttons.
      actions={
        <>
          <Button
            variant="primary"
            icon={<SyncIcon />}
            loading={busy()}
            onClick={() => void onSyncNow()}
          >
            {t('button.sync-now')}
          </Button>
          <Show when={hasPermission('SERVER_ADMIN')}>
            <Button
              variant="secondary"
              icon={<SettingsIcon />}
              onClick={onSettings}
            >
              {t('settings')}
            </Button>
          </Show>
        </>
      }
    >
      <div class={styles.content}>
        {/* Status band: the precedence status line above the phase list. */}
        <div class={styles.band}>
          <Switch>
            <Match when={statusKind() === 'waiting'}>
              <Spinner sizeRem={1.5} />
            </Match>
            <Match when={statusKind() === 'syncing'}>
              <p class={styles.statusLine}>{t('sync-info.syncing')}</p>
            </Match>
            <Match when={statusKind() === 'records-to-push'}>
              <p class={styles.statusLine}>
                {tPlural('label.records-to-push', pushQueueCount() ?? 0)}
              </p>
            </Match>
            <Match when={statusKind() === 'nothing-to-push'}>
              <p class={styles.statusLine}>{t('label.no-records-to-push')}</p>
            </Match>
          </Switch>
          <Show when={overview()}>
            {ov => (
              <ProgressList
                steps={progressSteps()}
                variant="primary"
                error={ov().error != null}
              />
            )}
          </Show>
          {/* "Special syncs" — the run's backfill descriptions, behind the same
              disclosure the error panel uses. Only when the run carries any. */}
          <Show when={backfills().length}>
            <details class={styles.specialSyncs}>
              <summary>
                {t('sync-status.linked-sync-requests', {
                  count: backfills().length,
                })}
              </summary>
              <ul class={styles.specialSyncsList}>
                <For each={backfills()}>{b => <li>{backfillLabel(b)}</li>}</For>
              </ul>
            </details>
          </Show>
        </div>

        {/* Error panel — only when the latest run errored (SYNC-03.28). */}
        <Show when={overview()?.error}>
          {err => {
            const errorSummary = () => syncErrorSummary(err().variant);
            const hintText = () => {
              const h = errorSummary().hint;
              return h ? t(h) : undefined;
            };
            return (
              <Alert severity="error">
                <div>{t(errorSummary().summary)}</div>
                <ErrorDetails detail={err().fullError} hint={hintText()} />
              </Alert>
            );
          }}
        </Show>

        {/* Last-successful notice — only when idle and error-free (SYNC-03.21). The
            banner is neutral; the check icon overrides the glyph and the
            message text carries the success tint. */}
        <Show
          when={overview()?.succeeded ? overview()?.lastSuccessful : undefined}
        >
          {last => (
            <Alert severity="neutral" icon={CheckCircleIcon}>
              <span class={styles.successText}>
                {t('messages.last-successful-sync-time-and-duration', {
                  time: lastSuccessTime(last().finished),
                  duration: lastSuccessDuration(
                    last().started,
                    last().finished
                  ),
                })}
              </span>
            </Alert>
          )}
        </Show>
      </div>
    </Dialog>
  );
};
