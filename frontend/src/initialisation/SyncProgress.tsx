import { Index, Show } from 'solid-js';
import type { Component } from 'solid-js';
import type { SyncOverview, SyncStep } from './syncStatus';
import { Alert } from '../ui/elements/feedback/Alert';
import { t } from '../intl';
import styles from '../ui/styles/shared.module.css';

// Spec (Initialization Logic): common component listing the sync steps and
// their progress.
const stepStatus = (step: SyncStep): string => {
  if (step.finished) return t('label.done');
  if (!step.started) return t('label.pending');
  if (step.done != null && step.total != null)
    return t('label.sync-progress', { done: step.done, total: step.total });
  return t('label.in-progress');
};

// toSyncOverview builds a fresh overview (and fresh step objects) on every
// status tick, so nothing here may key on object identity: non-keyed <Show>
// plus position-keyed <Index> update the existing DOM in place instead of
// remounting the whole list each tick.
export const SyncProgress: Component<{
  overview: SyncOverview | undefined;
}> = props => (
  <Show
    when={props.overview}
    fallback={<p>{t('messages.waiting-for-sync-status')}</p>}
  >
    {overview => (
      <div class={styles.stack}>
        <ul class={styles.list}>
          <Index each={overview().steps}>
            {step => (
              <li>
                {t(step().label)}: {stepStatus(step())}
              </li>
            )}
          </Index>
        </ul>
        <Show when={overview().errorMessage}>
          <Alert severity="error">{overview().errorMessage}</Alert>
        </Show>
      </div>
    )}
  </Show>
);
