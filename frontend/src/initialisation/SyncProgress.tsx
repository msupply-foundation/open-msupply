import { For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import type { SyncOverview, SyncStep } from './syncStatus';
import { Alert } from '../ui/elements/feedback/Alert';
import { t } from '../intl';
import styles from '../ui/styles/shared.module.css';

// Spec (Initialization Logic): common component listing the sync steps and
// their progress.
const stepStatus = (step: SyncStep): string => {
  if (step.finished) return t('sync.status.done');
  if (!step.started) return t('sync.status.pending');
  if (step.done != null && step.total != null)
    return t('sync.status.progress', { done: step.done, total: step.total });
  return t('sync.status.in-progress');
};

export const SyncProgress: Component<{
  overview: SyncOverview | undefined;
}> = props => (
  <Show when={props.overview} fallback={<p>{t('sync.waiting')}</p>} keyed>
    {overview => (
      <div class={styles.stack}>
        <ul class={styles.list}>
          <For each={overview.steps}>
            {step => (
              <li>
                {t(step.label)}: {stepStatus(step)}
              </li>
            )}
          </For>
        </ul>
        <Show when={overview.errorMessage}>
          <Alert severity="error">{overview.errorMessage}</Alert>
        </Show>
      </div>
    )}
  </Show>
);
