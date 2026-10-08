import type { JSX } from 'solid-js';
import styles from './Timeline.module.css';

/*
 * Record timeline — past events on a rail: a marker per event, joined
 * top-to-bottom by a connector, with each event's own content beside it.
 * For a record's history (a status history, an activity log): entries that
 * have all already happened, newest first.
 *
 * Deliberately NOT the determinate progress list (ui/sync/ProgressList),
 * which shares the picture and nothing else. That one models a multi-phase
 * operation — pending / in-progress / done, `aria-current="step"` on the
 * in-flight step, a live elapsed clock, a done/total count, an error point —
 * all derived from progression. A history has no progression and no current
 * entry: every row is a past fact. Feeding history rows through it would mean
 * switching off almost all of it and still announcing "done" on every entry.
 *
 * Semantics: an ordered list of events. The marker is DECORATION — the entry's
 * own content carries the meaning, so the marker is aria-hidden and the glyph
 * inside it never becomes the row's accessible name.
 */

export interface TimelineProps {
  children: JSX.Element;
  /** `data-testid` on the list (locale-stable test hook). */
  testId?: string;
}

export const Timeline = (props: TimelineProps): JSX.Element => (
  <ol class={styles.list} data-testid={props.testId}>
    {props.children}
  </ol>
);

export interface TimelineItemProps {
  /**
   * The glyph inside the marker circle — by intent (a person, a system cog).
   * Omit for a plain circle.
   */
  icon?: JSX.Element;
  /** The event's content, beside the marker. */
  children: JSX.Element;
}

export const TimelineItem = (props: TimelineItemProps): JSX.Element => (
  <li class={styles.item}>
    <span class={styles.marker} aria-hidden="true">
      {props.icon}
    </span>
    <div class={styles.content}>{props.children}</div>
  </li>
);
