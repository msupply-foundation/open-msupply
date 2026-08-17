import { Match, Show, Switch } from 'solid-js';
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
   * How loudly the cell reads — the escalation axis. It picks the mark's SHAPE
   * and, above neutral, gives the cell a tinted ground of its own. Escalation
   * never rides on the bar's ground: that ground is store data (brand orange on
   * a central server, an arbitrary hex where a store sets one), so no colour
   * placed straight on it can be held to a contrast ratio. A cell that needs to
   * shout brings its own surface, on which the house tint recipe holds AA.
   */
  tone: 'neutral' | 'warning' | 'error';
  /**
   * The mark's hue — the cue that arrives before the words are read. Redundant
   * by construction: the label states the state and the mark's shape escalates
   * with `tone`, so nothing here is carried by colour alone (ui-standards ›
   * accessibility § colour independence).
   */
  signal: 'success' | 'warning' | 'error' | 'muted';
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
 * The glyph an escalated tone takes. Error is the crossed circle, not the
 * exclamation circle: at 16px the latter is barely distinguishable from the
 * details button's info circle sitting immediately beside it, which is the one
 * comparison a reader actually makes.
 *
 * At rest the mark is a plain dot instead — the state is quiet, so the cell
 * shows the smallest thing that can still carry a hue. Escalation is a change
 * of SHAPE first, which is what keeps the ladder readable without colour.
 */
const toneIcon = {
  warning: AlertTriangleIcon,
  error: XCircleIcon,
};

/*
 * Whether the cell RAISES ITS VOICE — takes a ground of its own and swaps the
 * dot for the tone's glyph. Not simply `tone !== 'neutral'`: a muted signal
 * holds the cell quiet however the tone reads, which is what keeps an
 * unreachable server (a warning, by the precedence ladder) from shouting like
 * a stale site. The outage is news to report, and nothing is lost while it
 * lasts — so it stays a dot on the bar's own ground, and the words carry it.
 *
 * One derivation, read by both the glyph below and the CSS via `data-loud`, so
 * the two can never disagree about which state is shouting.
 *
 * Takes the two values rather than `props`: every call site is already a
 * tracked position, so both forms are reactive — but passing the object hides
 * the property reads from the reactivity lint, which then reports the calls as
 * untracked. Passing the values keeps the reads where the rule can see them.
 */
const isLoud = (
  tone: SyncStatusProps['tone'],
  signal: SyncStatusProps['signal']
): boolean => tone !== 'neutral' && signal !== 'muted';

export const SyncStatus = (props: SyncStatusProps) => (
  <div
    class={styles.group}
    data-tone={props.tone}
    data-signal={props.signal}
    data-loud={isLoud(props.tone, props.signal) ? '' : undefined}
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
        {/* A run in flight always keeps the broadcast glyph — it is the one
            that animates, and "syncing" is not a fault state. */}
        <Switch fallback={<span class={styles.dot} />}>
          <Match when={props.syncing}>
            <SyncIcon />
          </Match>
          <Match when={isLoud(props.tone, props.signal)}>
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
        <InfoIcon />
      </span>
    </button>
  </div>
);
