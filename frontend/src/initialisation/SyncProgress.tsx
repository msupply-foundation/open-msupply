import { For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import type { SyncOverview, SyncStep } from './syncStatus';
import styles from '../styles/shared.module.css';

// Spec (Initialization Logic): common component listing the sync steps and their progress.
const stepStatus = (step: SyncStep): string => {
  if (step.finished) return 'done';
  if (!step.started) return 'pending';
  if (step.done != null && step.total != null) return `${step.done} of ${step.total}`;
  return 'in progress';
};

export const SyncProgress: Component<{ overview: SyncOverview | undefined }> = props => (
  <Show when={props.overview} fallback={<p>Waiting for sync status…</p>} keyed>
    {overview => (
      <div>
        <ul class={styles.list}>
          <For each={overview.steps}>
            {step => (
              <li>
                {step.label}: {stepStatus(step)}
              </li>
            )}
          </For>
        </ul>
        <Show when={overview.errorMessage}>
          <p class={styles.errorText}>{overview.errorMessage}</p>
        </Show>
      </div>
    )}
  </Show>
);
