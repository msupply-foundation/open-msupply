import { children, Show, type Component, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckIcon,
  InfoIcon,
  type IconProps,
} from '../../icons';
import type { AlertSeverity } from '../../elements/feedback/Alert';
import styles from './StandingBanner.module.css';

/* Alert's own severity glyphs, so a banner and an inline notice of the same
   severity read alike (never colour alone — each severity has its own shape,
   and the message carries the meaning). */
const ICONS: Record<AlertSeverity, Component<IconProps>> = {
  error: AlertCircleIcon,
  warning: AlertTriangleIcon,
  info: InfoIcon,
  success: CheckIcon,
  neutral: InfoIcon,
};

export interface StandingBannerProps {
  /** Alert's severity vocabulary; drives the tint and the default glyph. */
  severity: AlertSeverity;
  /** Replaces the severity's default glyph, by intent (as Alert's `icon`). */
  icon?: Component<IconProps>;
  /**
   * The message cluster — a sentence, or a run of labelled facts. Fills the
   * row; wraps as it needs to.
   */
  children: JSX.Element;
  /**
   * The row's controls, pinned to the inline-end: a details popover, an apply
   * action, a way through to the screen the message concerns. What makes this
   * a banner rather than an alert — an alert is never actionable.
   */
  actions?: JSX.Element;
  /**
   * How assistive tech is told about the row. `status` (default) is the polite
   * live region a STANDING band wants — it re-reads on a poll, and an
   * interruption on every re-read would be noise. `alert` interrupts, for a
   * banner whose appearance is itself the event.
   */
  role?: 'status' | 'alert';
  /** `data-testid` for the row (locale-stable test hook, e2e/TESTIDS.md). */
  testId?: string;
}

/*
 * StandingBanner — the app-bar action-bearing standing-context banner
 * (spec/ui-standards/components.md § screen structure): a full-width row
 * carrying a message AND controls, for context that stands while the user
 * works — an outstanding cold-chain breach above every screen, an order's
 * outstanding ancillary items above its lines. More than the HeaderToolbar's
 * compact alert chip may hold (a compact alert is never actionable), and not
 * an inline Alert either: an Alert is a notice inside content, this is a
 * region of the page's chrome, so it spans its host edge to edge, sits under
 * a hairline rather than inside a rounded panel, and pins its controls to the
 * row's end.
 *
 * Placement is the host's: a page renders it in its header's toolbar row, the
 * shell renders it above the page. Hand-rolled — one <div> + CSS, no library —
 * with Alert's severity tint and glyph language so the two read as one family.
 */
export const StandingBanner = (props: StandingBannerProps) => {
  // Resolved once — a JSX prop read twice builds two element trees
  // (kdd/solid-reactivity-pitfalls §3).
  const actions = children(() => props.actions);
  return (
    <div
      class={styles.banner}
      data-severity={props.severity}
      role={props.role ?? 'status'}
      data-testid={props.testId}
    >
      <span class={styles.icon} aria-hidden="true">
        <Dynamic component={props.icon ?? ICONS[props.severity]} />
      </span>
      <div class={styles.content}>{props.children}</div>
      <Show when={actions()}>
        <div class={styles.actions}>{actions()}</div>
      </Show>
    </div>
  );
};
