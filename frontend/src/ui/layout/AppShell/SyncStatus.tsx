import { Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import {
  AlertTriangleIcon,
  InfoIcon,
  SyncIcon,
  XCircleIcon,
} from '../../icons';
import { t } from '../../../intl';
import styles from './SyncStatus.module.css';

export interface SyncStatusProps {
  /**
   * The status line, already resolved and localised by the host — "Synced 3
   * minutes ago", "14 records queued", "Sync error". The shell stays
   * presentational: what the wire status MEANS is the sync-modal vertical's
   * derivation (spec/sync-modal › contract § Substrate).
   */
  label: string;
  /**
   * How loudly the cell reads. It picks the GLYPH, not a colour: the bar is
   * brand orange on a central server, where an error-red or warning-orange
   * line is unreadable against it. Text and glyph keep the bar's own contrast-
   * checked content colour at every tone, and the escalation shows as a
   * different mark — which also satisfies colour independence outright rather
   * than leaning on the label to carry it.
   */
  tone: 'neutral' | 'warning' | 'error';
  /** A run is in flight — the glyph's arcs pulse outward while true. */
  syncing?: boolean;
  /**
   * Start a manual sync. One click, no dialog (issue #9229): the status line
   * IS the trigger, because starting a sync is what a user reaching for this
   * cell almost always wants.
   */
  onSync: () => void;
  /**
   * Open the sync modal — the full run detail, behind its own small button so
   * the one-click path above stays unambiguous.
   */
  onDetails: () => void;
}

/*
 * The bottom bar's sync cell (spec/chrome § sync status) — the site's standing
 * sync signal, at the inline-end of the bar. It replaces the sidebar's former
 * Sync entry: that entry navigated nowhere, so a menu row was the wrong shape
 * for it, and the bar can carry the status in words rather than a bare badge.
 *
 * Two controls, deliberately split: the status line starts a sync on one click,
 * and the details button opens the modal. Making the line itself open the modal
 * would put a dialog between the user and the thing they came for; making the
 * whole cell sync would leave the run detail unreachable.
 */

/*
 * The glyph the tone escalates to. A run in flight always keeps the broadcast
 * mark — it is the one that animates, and "syncing" is not a fault state.
 *
 * Error is the crossed circle, not the exclamation circle: at 16px the latter
 * is barely distinguishable from the details button's info circle sitting
 * immediately beside it, which is the one comparison a reader actually makes.
 */
const toneIcon = {
  neutral: SyncIcon,
  warning: AlertTriangleIcon,
  error: XCircleIcon,
};
export const SyncStatus = (props: SyncStatusProps) => (
  <div class={styles.group} data-tone={props.tone} data-testid="footer-sync">
    <button
      type="button"
      class={styles.cell}
      onClick={() => props.onSync()}
      disabled={props.syncing}
      data-testid="footer-sync-now"
    >
      {/* The animated state rides a wrapper rather than the <svg> itself:
          the icon set's components take styling props, not state ones (and
          MenuBar's dimmed icon is wrapped for the same reason). */}
      <span
        class={styles.icon}
        data-syncing={props.syncing ? '' : undefined}
        aria-hidden="true"
      >
        <Show when={!props.syncing} fallback={<SyncIcon />}>
          <Dynamic component={toneIcon[props.tone]} />
        </Show>
      </span>
      <span class={styles.srOnly}>{`${t('button.sync-now')}: `}</span>
      <span class={styles.label}>{props.label}</span>
    </button>
    <button
      type="button"
      class={`${styles.cell} ${styles.details}`}
      onClick={() => props.onDetails()}
      title={t('button.sync-details')}
      aria-label={t('button.sync-details')}
      data-testid="footer-sync-details"
    >
      <span class={styles.icon} aria-hidden="true">
        <InfoIcon />
      </span>
    </button>
  </div>
);
