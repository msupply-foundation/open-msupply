import { Show } from 'solid-js';
import type { Component } from 'solid-js';
import type { SyncOverview } from './syncStatus';
import { ProgressList, type ProgressStep } from '../ui/sync/ProgressList';
import { Alert } from '../ui/elements/feedback/Alert';
import {
  ChevronsUpIcon,
  ChevronsDownIcon,
  ClockIcon,
  DownloadIcon,
  type IconProps,
} from '../ui/icons';
import { t, type LocaleKey } from '../intl';
import styles from '../ui/styles/shared.module.css';

// Marker icon per phase, by intent — the same choices as the sync modal: push
// = up chevrons, wait = clock, pull = down chevrons, integrate = download; the
// initialisation-only prepare phase has none (ProgressList shows its number).
const STEP_ICON: Partial<Record<LocaleKey, Component<IconProps>>> = {
  'sync-status.push': ChevronsUpIcon,
  'sync-status.push-v6': ChevronsUpIcon,
  'sync-status.waiting-for-integration': ClockIcon,
  'sync-status.pull': ChevronsDownIcon,
  'sync-status.pull-central': ChevronsDownIcon,
  'sync-status.pull-remote': ChevronsDownIcon,
  'sync-status.pull-v6': ChevronsDownIcon,
  'sync-status.integrate': DownloadIcon,
};

// Spec (Initialization Logic): the first-sync phase list, rendered as the
// shared determinate progress list (ui/sync ProgressList) in the secondary
// (initialisation) tone. Steps arrive as fresh objects every status tick, so
// ProgressList's position-keyed <Index> updates the rows in place.
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
          error={overview().errorMessage != null}
          steps={overview().steps.map((s): ProgressStep => ({
            label: t(s.label),
            started: s.started,
            finished: s.finished,
            done: s.done,
            total: s.total,
            icon: STEP_ICON[s.label],
          }))}
        />
        <Show when={overview().errorMessage}>
          {message => <Alert severity="error">{message()}</Alert>}
        </Show>
      </div>
    )}
  </Show>
);
