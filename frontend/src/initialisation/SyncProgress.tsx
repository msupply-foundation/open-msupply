import { Show } from 'solid-js';
import type { Component } from 'solid-js';
import type { SyncOverview } from '../sections/sync-modal/syncStatus';
import { syncStepIcon } from '../sections/sync-modal/syncStepIcons';
import { ProgressList, type ProgressStep } from '../ui/sync/ProgressList';
import { t } from '../intl';
import styles from '../ui/styles/shared.module.css';

// Spec (Initialization Logic): the first-sync phase list, rendered as the
// shared determinate progress list (ui/sync ProgressList) in the secondary
// (initialisation) tone. Steps arrive as fresh objects every status tick, so
// ProgressList's position-keyed <Index> updates the rows in place. Icon choice
// is the shared sections/sync-modal/syncStepIcons map (by step kind), the same
// substrate the sync modal itself uses — not a page-local copy.
export const SyncProgress: Component<{
  overview: SyncOverview | undefined;
}> = props => (
  <Show
    when={props.overview}
    fallback={<p>{t('messages.waiting-for-sync-status')}</p>}
  >
    {overview => (
      <div class={styles.stack}>
        <ProgressList
          variant="secondary"
          error={overview().error != null}
          steps={overview().steps.map((s): ProgressStep => ({
            label: t(s.label),
            started: s.started,
            finished: s.finished,
            done: s.done,
            total: s.total,
            startedAt: s.startedAt,
            finishedAt: s.finishedAt,
            icon: syncStepIcon[s.kind],
          }))}
        />
      </div>
    )}
  </Show>
);
