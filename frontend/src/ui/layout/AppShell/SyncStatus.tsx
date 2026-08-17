import { Match, Show, Switch } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import {
  AlertTriangleIcon,
  ChevronsUpIcon,
  SyncIcon,
  WifiOffIcon,
  XCircleIcon,
} from '../../icons';
import { t } from '../../../intl';
import styles from './SyncStatus.module.css';

export interface SyncStatusProps {
  /**
   * The state, in a word or two, already resolved and localised by the host —
   * "Synced", "14 records queued", "Sync error". The shell stays
   * presentational: what the wire status MEANS is the sync-modal vertical's
   * derivation (spec/sync-modal › contract § Substrate).
   */
  label: string;
  /**
   * The quieter half of the line — "3 minutes ago" beside Synced, "last synced
   * 2 hours ago" beside a fault. Split from the label so the state itself is
   * what the eye lands on and the timing sits behind it; absent where the
   * label is the whole message (a queue count, a run in flight).
   */
  detail?: string;
  /**
   * How loudly the cell reads. It picks the GLYPH, not a colour: the bar's
   * ground is store data — brand orange on a central server, an arbitrary hex
   * wherever a store sets one — so no colour drawn on it can be held to a
   * contrast ratio, and a hue that lands near the store's own simply
   * disappears. Text and glyph keep the bar's own contrast-checked content
   * colour at every tone, and the escalation shows as a different mark — which
   * also satisfies colour independence outright rather than leaning on the
   * label to carry it.
   */
  tone: 'neutral' | 'warning' | 'error';
  /**
   * Sync is not running and cannot, because the server is out of reach (issue
   * #1087). Its own level, below the tones — an outage is not a fault to answer
   * but a fact to report, and nothing is lost while it lasts. The cell dims AND
   * takes the disconnected mark, which outranks any tone glyph: naming the
   * cause is more use than an alarm the user can do nothing about.
   */
  dimmed?: boolean;
  /** A run is in flight — the sync glyph spins while true. */
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
 * The mark an escalated tone takes, in place of the sync glyph. Error is the
 * crossed circle rather than the exclamation circle: the two are barely
 * separable at 16px, and the crossed circle also says "did not happen", which
 * is what a failed run means.
 *
 * Escalation is a change of SHAPE — that is what keeps the ladder readable
 * without colour, on a bar whose own colour is not ours to predict.
 */
const toneIcon = {
  warning: AlertTriangleIcon,
  error: XCircleIcon,
};

export const SyncStatus = (props: SyncStatusProps) => (
  <div
    class={styles.group}
    data-tone={props.tone}
    data-dimmed={props.dimmed ? '' : undefined}
    data-testid="footer-sync"
  >
    {/* aria-disabled, not disabled: a disabled control drops keyboard focus to
        the body at the very moment it was activated, and vanishes from the tab
        order mid-run. The guard below makes the in-flight no-op real; the
        shared trigger machine behind onSync additionally ignores re-fires
        (e.g. the keyboard binding), so the gate isn't only presentational. */}
    <button
      type="button"
      class={styles.cell}
      onClick={() => {
        if (!props.syncing) props.onSync();
      }}
      aria-disabled={props.syncing ? 'true' : undefined}
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
        {/* Order is the rule here, so read it top-down.

            A run in flight always keeps the sync glyph: it is the one that can
            spin, and "syncing" is not a fault state. Today no state is both
            in-flight and escalated (arming a run resets the tone to neutral),
            but the animation contract shouldn't rest on that holding.

            DIMMED OUTRANKS THE TONE. An unreachable server is a warning by the
            precedence ladder, yet it must not wear the same mark as a site that
            has gone stale: one says sync cannot happen, the other that sync is
            behind. Naming the cause outright — no connection — is more use than
            an alarm the user can do nothing about. */}
        <Switch fallback={<SyncIcon />}>
          <Match when={props.syncing}>
            <SyncIcon />
          </Match>
          <Match when={props.dimmed}>
            <WifiOffIcon />
          </Match>
          <Match when={props.tone !== 'neutral'}>
            <Dynamic
              component={toneIcon[props.tone === 'error' ? 'error' : 'warning']}
            />
          </Match>
        </Switch>
      </span>
      <span class={styles.srOnly}>{`${t('button.sync-now')}: `}</span>
      <span class={styles.label}>{props.label}</span>
      <Show when={props.detail}>
        {/* The comma is read, not seen: on screen the lighter weight and the
            gap separate the two halves, while a screen reader (and any text
            assertion) gets one properly punctuated sentence rather than two
            clauses run together. */}
        <span class={styles.srOnly}>, </span>
        <span class={styles.detail}>{props.detail}</span>
      </Show>
    </button>
    {/* Announce the run starting (the visible response a sighted user gets from
        the glyph). Populated ONLY while in flight — a live region on the label
        itself would also announce every minutely re-age of "Synced … ago",
        turning a status line into a metronome. */}
    <span class={styles.srOnly} role="status">
      {props.syncing ? props.label : ''}
    </span>
    <button
      type="button"
      class={`${styles.cell} ${styles.details}`}
      onClick={() => props.onDetails()}
      title={t('button.sync-details')}
      aria-label={t('button.sync-details')}
      data-testid="footer-sync-details"
    >
      <span class={styles.icon} aria-hidden="true">
        <ChevronsUpIcon />
      </span>
    </button>
  </div>
);
