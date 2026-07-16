import { Show } from 'solid-js';
import { A } from '@solidjs/router';
import { AlertTriangleIcon, InfoIcon } from '../../icons';
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
  /** Raise visual emphasis (e.g. emergency requisitions > 0). */
  alert?: boolean;
}

/*
 * A single dashboard statistic (ui-standards § Dashboard): a value over a label,
 * the whole thing a link into the list it counts. Hand-rolled, pure CSS + a
 * semantic <a> (the router's <A>), so it carries a real link role and accessible
 * name for free. When `alert` is set the value is emphasised AND flagged with an
 * icon — meaning is never carried by colour alone (accessibility § colour
 * independence). `info` adds a small tooltip marker.
 */
export const Statistic = (props: StatisticProps) => (
  <A
    href={props.href}
    class={styles.stat}
    data-alert={props.alert ? '' : undefined}
    aria-label={`${props.value} ${props.label}`}
  >
    <span class={styles.value}>
      <Show when={props.alert}>
        <span class={styles.alertIcon} aria-hidden="true">
          <AlertTriangleIcon />
        </span>
      </Show>
      {props.value}
    </span>
    <span class={styles.label}>
      {props.label}
      <Show when={props.info}>
        <span class={styles.info} title={props.info} aria-hidden="true">
          <InfoIcon />
        </span>
      </Show>
    </span>
  </A>
);
