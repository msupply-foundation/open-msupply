import { Show } from 'solid-js';
import { A } from '@solidjs/router';
import { InfoIcon } from '../../icons';
import { StatusChip } from '../feedback/StatusChip';
import styles from './Statistic.module.css';

export interface StatisticProps {
  /** Short label describing the metric, already translated. */
  label: string;
  /** The value, already locale-formatted for display. */
  value: string;
  /** Link target — the list this metric drills into. */
  href: string;
  /** Optional explanatory tooltip, already translated. */
  info?: string;
  /** Raise an alert emphasis (e.g. emergency requisitions > 0). */
  alert?: boolean;
  /**
   * The translated alert text (e.g. "Needs attention"), shown as a red status
   * chip beneath the stat when `alert` is set — the meaning is carried by the
   * chip's text, never by colour alone (accessibility § colour independence).
   */
  alertLabel?: string;
  /** e2e testid — the stat's published id (e2e/TESTIDS.md § Dashboard). */
  testId?: string;
}

/*
 * A single dashboard statistic (ui-standards § Dashboard): a big value beside
 * its label (one row of a panel's vertical list; the value sits in a right-
 * aligned column so rows line up), the whole thing a link into the list it
 * counts. Hand-rolled, pure CSS + a semantic <a> (the router's <A>), so it
 * carries a real link role and accessible name for free. When `alert` is set a
 * red "needs attention" StatusChip appears beneath — matching the current app,
 * whose value stays normal and whose emphasis is the chip. `info` adds a small
 * tooltip marker in the brand tone.
 */
export const Statistic = (props: StatisticProps) => (
  <A
    href={props.href}
    class={styles.stat}
    data-testid={props.testId}
    aria-label={`${props.value} ${props.label}${
      props.alert && props.alertLabel ? `, ${props.alertLabel}` : ''
    }`}
  >
    <span class={styles.main}>
      <span class={styles.value}>{props.value}</span>
      <span class={styles.label}>
        {props.label}
        <Show when={props.info}>
          <span class={styles.info} title={props.info} aria-hidden="true">
            <InfoIcon />
          </span>
        </Show>
      </span>
    </span>
    <Show when={props.alert && props.alertLabel}>
      <span class={styles.alert}>
        <StatusChip label={props.alertLabel!} colour="var(--error-main)" />
      </span>
    </Show>
  </A>
);
